import asyncio
import logging
import os
import shlex
import tempfile
import time
from enum import Enum
from typing import Any, Dict, List

import aiofiles
import aiofiles.os
import psutil
import uuid6

# Configure logging
logging.basicConfig(
    level=logging.INFO, format='[%(asctime)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S'
)

# Constants
OUTPUT_DIR = '/tmp/pcb_logs'
DEFAULT_LOG_LINES = 10
MAX_LOG_LINES = 100
TERM_TIMEOUT = 2.0  # seconds
KILL_TIMEOUT = 1.0  # seconds
UNKNOWN_EXIT_CODE = -999
KILL_EXIT_CODE = -9


class ProcessStatus(str, Enum):
    """Enum for process status states."""

    INITIALIZING = 'initializing'
    RUNNING = 'running'
    FINISHED_OK = 'finished_ok'
    FINISHED_ERROR = 'finished_error'
    TERMINATING = 'terminating'
    TERMINATED = 'terminated'
    ERROR_START = 'error_start'
    ERROR_TERMINATE = 'error_terminate'
    UNKNOWN = 'unknown'


class ProcessControlBlock:
    """
    Manages the state and operations for a single process run initiated via the agent.
    Handles process starting, status checking, log reading, stats gathering, and termination.
    Designed to be thread-safe for use with asyncio.to_thread.
    """

    def __init__(
        self,
        identifier: str,
        command_str: str,
        env: Dict[str, str] | None = None,
        cwd: str | None = None,
    ):
        """
        Initializes the PCB. Does not start the process. Call start() to begin execution.

        Args:
            identifier: A user-defined string categorizing the process and serving as unique key.
            command_str: The command string to be executed.
            env: Optional dictionary of environment variables to set for the subprocess.
                 If None, the environment of the agent process is inherited.
            cwd: Optional working directory for the subprocess.
                 If None, the current working directory of the agent process is used.
        """
        # Basic identifiers
        self.identifier = identifier
        self.run_id = str(uuid6.uuid6().hex)  # Generate internal run_id for logging
        self.command_str = command_str
        self.custom_env = env
        self.cwd = cwd

        # Process state
        self.proc: asyncio.subprocess.Process | None = None
        self.pid: int | None = None
        self._status: ProcessStatus = ProcessStatus.INITIALIZING
        self.exit_code: int | None = None
        self.start_time: float = time.time()
        self.end_time: float | None = None

        # Log file handling
        self.stdout_file = None
        self.stderr_file = None
        self.stdout_log_path = None
        self.stderr_log_path = None
        self.stdout_offset = 0
        self.stderr_offset = 0

        self.log_file_path = os.path.join(
            OUTPUT_DIR, f'{self.identifier}_{self.run_id}.log'
        )

        # Concurrency control
        self._lock = asyncio.Lock()
        self._process_monitor_task = None

    #
    # Process Lifecycle Methods
    #

    async def start(self) -> None:
        """
        Starts the subprocess using asyncio.create_subprocess_exec,
        redirecting stdout/stderr to temporary files, and launches a task to monitor
        process exit.
        """
        async with self._lock:
            return await self._start()

    async def _start(self) -> None:
        """
        Internal implementation of process startup logic.
        Called by start() after acquiring the lock.
        """
        if self._status != ProcessStatus.INITIALIZING:
            logging.warning(
                f'[{self.identifier}_{self.run_id}] Process already started or in a non-initial state: {self._status}'
            )
            return

        try:
            self.start_time = time.time()

            # Ensure the output directory exists (using aiofiles to avoid blocking)
            await aiofiles.os.makedirs(OUTPUT_DIR, exist_ok=True)

            # Parse command and prepare environment
            command_list = shlex.split(self.command_str)
            if not command_list:
                raise ValueError(
                    'Command string resulted in an empty command list after parsing.'
                )

            effective_env = None
            if self.custom_env is not None:
                effective_env = os.environ.copy()
                effective_env.update(self.custom_env)
                logging.info(
                    f'[{self.identifier}_{self.run_id}] Starting with custom environment variables (merged). Keys: {list(self.custom_env.keys())}'
                )
            else:
                logging.info(
                    f'[{self.identifier}_{self.run_id}] Starting with inherited environment.'
                )

            # Create temporary files for stdout and stderr
            self.stdout_file = await asyncio.to_thread(
                tempfile.NamedTemporaryFile,
                prefix=f'{self.identifier}_{self.run_id}_stdout_',
                suffix='.log',
                delete=False,
                mode='wb+',
            )
            self.stderr_file = await asyncio.to_thread(
                tempfile.NamedTemporaryFile,
                prefix=f'{self.identifier}_{self.run_id}_stderr_',
                suffix='.log',
                delete=False,
                mode='wb+',
            )
            self.stdout_log_path = self.stdout_file.name
            self.stderr_log_path = self.stderr_file.name

            # Start the subprocess with stdin pipe
            self.proc = await asyncio.create_subprocess_exec(
                *command_list,
                stdin=asyncio.subprocess.PIPE,
                stdout=self.stdout_file,
                stderr=self.stderr_file,
                env=effective_env,
                cwd=self.cwd,
            )
            self.pid = self.proc.pid

            if self.pid is None:
                raise RuntimeError(
                    'Process failed to start - no PID assigned by asyncio'
                )

            self._status = ProcessStatus.RUNNING
            logging.info(
                f'[{self.identifier}_{self.run_id}] Process started successfully. PID={self.pid}, '
                f"CMD='{self.command_str}'"
            )

            async with aiofiles.open(self.log_file_path, 'w', encoding='utf-8') as f:
                await f.write(f'Process started: {self.command_str}\n')
                await f.write(
                    'Standard output and error are being written to separate files:\n'
                )
                await f.write(f'  - STDOUT: {self.stdout_log_path}\n')
                await f.write(f'  - STDERR: {self.stderr_log_path}\n')

            # Start task to monitor exit
            self._process_monitor_task = asyncio.create_task(
                self._monitor_process_exit()
            )

        except Exception as e:
            self._status = ProcessStatus.ERROR_START
            self.end_time = time.time()
            error_msg = f"Failed to start process. CMD='{self.command_str}'. Error: {e}"
            logging.error(
                f'[{self.identifier}_{self.run_id}] {error_msg}', exc_info=True
            )

            # Write error to log file directly
            async with aiofiles.open(
                self.log_file_path, 'a', encoding='utf-8'
            ) as f_err:
                await f_err.write(
                    f'\n### PROCESS START FAILED ###\nCommand: {self.command_str}\nError: {e}\n'
                )
            raise
        finally:
            # Clean up temporary files
            await asyncio.to_thread(self._cleanup_temp_files)

    async def _monitor_process_exit(self) -> None:
        """
        Waits for the process to exit and updates its status, exit_code, and end_time.
        Ensures processes are properly reaped to avoid zombies.
        """
        if not self.proc:
            return

        try:
            exit_code_val = await self.proc.wait()
        except asyncio.CancelledError:
            logging.info(
                f'[{self.identifier}_{self.run_id}] Process exit monitoring cancelled.'
            )
            return
        except Exception as e:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Error waiting for process exit: {e}',
                exc_info=True,
            )
            exit_code_val = UNKNOWN_EXIT_CODE
        finally:
            # Close file handles after process completes
            await asyncio.to_thread(self._cleanup_temp_files)

            async with self._lock:
                # Check if status was already set by kill()
                if self._status not in [
                    ProcessStatus.TERMINATING,
                    ProcessStatus.TERMINATED,
                ]:
                    self.exit_code = exit_code_val
                    self.end_time = time.time()
                    self._status = (
                        ProcessStatus.FINISHED_OK
                        if exit_code_val == 0
                        else ProcessStatus.FINISHED_ERROR
                    )
                    logging.info(
                        f'[{self.identifier}_{self.run_id}] Process {self.pid} finished naturally. Status={self._status}, ExitCode={self.exit_code}'
                    )

                logging.info(
                    f'[{self.identifier}_{self.run_id}] Process monitoring complete. Final status: {self._status}, Final exit code: {self.exit_code}'
                )

    async def kill(self) -> None:
        """
        Attempts to terminate the process gracefully (SIGTERM), waits briefly,
        and then forcefully kills it (SIGKILL) if necessary.
        Updates the process status accordingly.
        This method is thread-safe.
        """
        async with self._lock:
            return await self._kill()

    async def _kill(self) -> None:
        """
        Internal implementation of kill logic.
        Called by kill() after acquiring the lock.
        """
        if (
            self._status not in [ProcessStatus.RUNNING, ProcessStatus.INITIALIZING]
            or not self.proc
        ):
            logging.info(
                f'[{self.identifier}_{self.run_id}] Process {self.pid} is not running/initialising or proc object missing (status: {self._status}). Kill request ignored.'
            )
            return

        if self.proc.returncode is not None:  # Already exited
            logging.info(
                f'[{self.identifier}_{self.run_id}] Process {self.pid} already exited with code {self.proc.returncode}. Kill request ignored.'
            )
            if (
                self._status == ProcessStatus.RUNNING
            ):  # Status not yet updated by monitor
                logging.info(
                    f'[{self.identifier}_{self.run_id}] Updating status from RUNNING to reflect exit code {self.proc.returncode}'
                )
                self._update_process_state_after_exit(self.proc.returncode)
            return

        self._status = ProcessStatus.TERMINATING
        original_exit_code = None
        try:
            # First, try SIGTERM
            logging.info(
                f'[{self.identifier}_{self.run_id}] Attempting to terminate PID {self.pid} (SIGTERM).'
            )
            self.proc.terminate()
            try:
                original_exit_code = await asyncio.wait_for(
                    self.proc.wait(), timeout=TERM_TIMEOUT
                )
                self.exit_code = original_exit_code
                logging.info(
                    f'[{self.identifier}_{self.run_id}] Process {self.pid} terminated gracefully after SIGTERM. ExitCode={self.exit_code}'
                )
            except asyncio.TimeoutError:
                # SIGTERM didn't work, try SIGKILL
                logging.info(
                    f'[{self.identifier}_{self.run_id}] Process {self.pid} did not terminate after SIGTERM timeout ({TERM_TIMEOUT}s). Sending SIGKILL.'
                )
                self.proc.kill()
                try:
                    original_exit_code = await asyncio.wait_for(
                        self.proc.wait(), timeout=KILL_TIMEOUT
                    )
                    self.exit_code = original_exit_code
                except asyncio.TimeoutError:
                    logging.warning(
                        f'[{self.identifier}_{self.run_id}] Process {self.pid} did not report exit code quickly after SIGKILL ({KILL_TIMEOUT}s).'
                    )
                    self.exit_code = KILL_EXIT_CODE
                except Exception as e_kill_wait:
                    logging.error(
                        f'[{self.identifier}_{self.run_id}] Error waiting for process after SIGKILL: {e_kill_wait}'
                    )
                    self.exit_code = KILL_EXIT_CODE

            self.end_time = time.time()
            self._status = ProcessStatus.TERMINATED
            logging.info(
                f'[{self.identifier}_{self.run_id}] Kill sequence completed for PID {self.pid}. Final Status={self._status}, ExitCode={self.exit_code}'
            )

        except Exception as e:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Error during termination sequence of PID {self.pid}: {e}',
                exc_info=True,
            )
            self._status = ProcessStatus.UNKNOWN
            if self.exit_code is None:
                self.exit_code = UNKNOWN_EXIT_CODE
            if self.end_time is None:
                self.end_time = time.time()
        finally:
            # Ensure monitor task is cleaned up
            if self._process_monitor_task:
                self._process_monitor_task.cancel()
                try:
                    await self._process_monitor_task
                except asyncio.CancelledError:
                    pass
                finally:
                    self._process_monitor_task = None

            # Close file handles
            await asyncio.to_thread(self._cleanup_temp_files)

            # If the process object exists and has a return code, ensure exit_code is set.
            if (
                self.proc
                and self.proc.returncode is not None
                and self.exit_code is None
            ):
                self.exit_code = self.proc.returncode
                if self.end_time is None:
                    self.end_time = time.time()

    def _cleanup_temp_files(self):
        """Clean up temporary log files if they exist."""
        try:
            if self.stdout_file:
                self.stdout_file.close()
            if self.stderr_file:
                self.stderr_file.close()
        except Exception as e:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Error closing temporary files: {e}'
            )

    def _update_process_state_after_exit(self, exit_code: int) -> None:
        """
        Updates process state after exit with the given exit code.
        This helper centralizes the state update logic.
        """
        self.exit_code = exit_code
        self.end_time = time.time()
        if exit_code == 0:
            self._status = ProcessStatus.FINISHED_OK
        elif exit_code is not None:
            self._status = ProcessStatus.FINISHED_ERROR

        logging.info(
            f'[{self.identifier}_{self.run_id}] Updated process state after exit: Status={self._status}, ExitCode={self.exit_code}'
        )

    def _update_on_exit_locked(self):
        """
        Checks if the process has exited and updates status, exit_code, and end_time.
        This method assumes the lock is already held.
        This is a fallback mechanism in case _monitor_process_exit hasn't updated the status yet.
        """
        if self.proc and self.proc.returncode is not None:
            if self._status in [ProcessStatus.RUNNING, ProcessStatus.INITIALIZING]:
                logging.warning(
                    f'[{self.identifier}_{self.run_id}] Internal status update: process ended (rc={self.proc.returncode}) '
                    f'but status was {self._status}. Updating to reflect exit code {self.proc.returncode}.'
                )
                self._update_process_state_after_exit(self.proc.returncode)

    #
    # Status and Stats Methods
    #

    async def get_status(self) -> str:
        """
        Returns the current status of the process run.
        This method is thread-safe.
        """
        async with self._lock:
            return await self._get_status()

    async def _get_status(self) -> str:
        """
        Internal implementation of get_status logic.
        Called by get_status() after acquiring the lock.
        """
        self._update_on_exit_locked()
        return self._status.value

    async def get_stats(self) -> Dict[str, Any]:
        """
        Retrieves process statistics (memory, threads, etc.) using psutil
        if the process is running. Returns cached info or error otherwise.
        This method is thread-safe.

        Returns:
            A dictionary containing process statistics or error information.
        """
        async with self._lock:
            return await self._get_stats()

    async def _get_stats(self) -> Dict[str, Any]:
        """
        Internal implementation of get_stats logic.
        Called by get_stats() after acquiring the lock.
        """
        # Ensure status is up-to-date
        self._update_on_exit_locked()
        current_status_locked = self._status
        pid_to_check = self.pid

        stats = {
            'pid': pid_to_check,
            'status': current_status_locked.value,
            'cpu_percent': None,
            'memory_rss_bytes': None,
            'memory_vms_bytes': None,
            'num_threads': None,
            'create_time': self.start_time,
            'psutil_status': None,
            'error': None,
        }

        # Add error information for finished-with-error processes
        if current_status_locked == ProcessStatus.FINISHED_ERROR and not stats['error']:
            try:
                stats['error'] = (
                    f'Process finished with non-zero exit code: {self.exit_code}'
                )
            except Exception as e_log:
                logging.error(
                    f'[{self.identifier}_{self.run_id}] Error trying to get error message for stats: {e_log}'
                )

        # If process is running, get live stats
        if current_status_locked == ProcessStatus.RUNNING and pid_to_check:
            psutil_data = await asyncio.to_thread(
                self._get_psutil_stats_sync, pid_to_check
            )
            stats.update(psutil_data)

            # Handle case where process not found by psutil but we think it's running
            if psutil_data.get('error') == 'Process not found by psutil':
                logging.info(
                    f"[{self.identifier}_{self.run_id}] Correcting status to 'unknown' based on NoSuchProcess for PID {self.pid} during stats fetch."
                )
                self._status = ProcessStatus.UNKNOWN
                if self.exit_code is None:
                    self.exit_code = UNKNOWN_EXIT_CODE
                if self.end_time is None:
                    self.end_time = time.time()
                stats['status'] = self._status.value

        return stats

    def _get_psutil_stats_sync(self, pid_to_check: int) -> Dict[str, Any]:
        """Synchronous helper to fetch psutil stats."""
        stats_dict = {
            'cpu_percent': None,
            'memory_rss_bytes': None,
            'memory_vms_bytes': None,
            'num_threads': None,
            'psutil_status': None,
            'error': None,
        }
        try:
            p = psutil.Process(pid_to_check)
            with p.oneshot():
                mem_info = p.memory_info()
                cpu_times = p.cpu_times()
                total_cpu_time = cpu_times.user + cpu_times.system

                # Calculate CPU percent based on process uptime
                process_uptime_seconds = time.time() - self.start_time

                if process_uptime_seconds > 0:
                    num_cores = max(psutil.cpu_count(logical=True) or 1, 1)
                    cpu_percent_val = (
                        total_cpu_time / (process_uptime_seconds * num_cores)
                    ) * 100
                else:
                    cpu_percent_val = 0.0

                stats_dict.update(
                    {
                        'memory_rss_bytes': mem_info.rss,
                        'memory_vms_bytes': mem_info.vms,
                        'num_threads': p.num_threads(),
                        'psutil_status': p.status(),
                        'cpu_percent': cpu_percent_val,
                    }
                )
        except psutil.NoSuchProcess:
            stats_dict['error'] = 'Process not found by psutil'
        except Exception as e:
            stats_dict['error'] = f'Error getting stats via psutil: {str(e)}'
            logging.error(
                f'[{self.identifier}_{self.run_id}] Sync error getting psutil stats for PID {pid_to_check}: {e}',
                exc_info=True,
            )
        return stats_dict

    #
    # Input/Output Methods
    #

    async def send_stdin(self, data: str) -> bool:
        """
        Sends data to the standard input of the running process.

        Args:
            data: The string data to send to the process's stdin.

        Returns:
            True if data was sent successfully, False otherwise.

        Raises:
            RuntimeError: If the process stdin is not available.
            ConnectionResetError: If the connection is reset while sending data.
            BrokenPipeError: If the pipe is broken while sending data.
            Exception: For other errors during sending.
        """
        async with self._lock:
            return await self._send_stdin(data)

    async def _send_stdin(self, data: str) -> bool:
        """
        Internal implementation of send_stdin logic.
        Called by send_stdin() after acquiring the lock.
        """
        # Check if process is running and stdin is available
        if not self.proc or not self.proc.stdin:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Process stdin is not available'
            )
            return False

        if self._status != ProcessStatus.RUNNING:
            logging.warning(
                f'[{self.identifier}_{self.run_id}] Process is not running (status: {self._status}). Cannot send stdin data.'
            )
            return False

        try:
            # Ensure data ends with newline if not already present
            if not data.endswith('\n'):
                data += '\n'

            # Write data as bytes to stdin and flush
            encoded_data = data.encode('utf-8')
            self.proc.stdin.write(encoded_data)
            await self.proc.stdin.drain()
            logging.info(
                f'[{self.identifier}_{self.run_id}] Sent {len(data)} bytes to stdin: {data.strip()}'
            )
            return True
        except ConnectionResetError:
            logging.warning(
                f'[{self.identifier}_{self.run_id}] Connection reset when sending data to stdin'
            )
            raise
        except BrokenPipeError:
            logging.warning(
                f'[{self.identifier}_{self.run_id}] Broken pipe when sending data to stdin'
            )
            raise
        except Exception as e:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Error sending data to stdin: {e}',
                exc_info=True,
            )
            raise

    async def read_log_lines(
        self, log_path: str | None, offset: int, num_lines: int = DEFAULT_LOG_LINES
    ) -> tuple[List[str], int]:
        """
        Helper method to read up to 'num_lines' of complete lines from a log file,
        starting from the given offset. Returns the lines read and the new offset.

        Uses a non-blocking approach that reads chunks of data rather than waiting
        for complete lines, avoiding potential blocking when a process writes
        incomplete lines.

        Args:
            log_path: Path to the log file to read from
            offset: Current offset position in the file
            num_lines: Maximum number of lines to read

        Returns:
            A tuple containing (list of lines read, new offset position)
        """
        if not (0 < num_lines <= MAX_LOG_LINES):
            raise ValueError(f'num_lines must be between 1 and {MAX_LOG_LINES}')
        if not log_path or not await aiofiles.os.path.exists(log_path):
            return [], offset

        CHUNK_SIZE = 8192  # 8KB
        lines = []
        partial_line = ''
        bytes_consumed = 0
        encoding = 'utf-8'

        async with aiofiles.open(
            log_path, mode='r', encoding=encoding, errors='replace'
        ) as f:
            await f.seek(offset)
            while len(lines) < num_lines:
                chunk = await f.read(CHUNK_SIZE)
                if not chunk:
                    break
                data = partial_line + chunk
                all_lines = data.splitlines(keepends=True)
                # If the chunk doesn't end with a newline, the last line is incomplete
                if chunk and not chunk.endswith('\n'):
                    partial_line = all_lines[-1]
                    all_lines = all_lines[:-1]
                else:
                    partial_line = ''
                for line in all_lines:
                    if len(lines) < num_lines:
                        lines.append(line.rstrip('\n'))
                        bytes_consumed += len(line.encode(encoding))
                    if len(lines) >= num_lines:
                        break
                if len(lines) >= num_lines:
                    break
            # If we reach EOF with a pending partial line, include it
            if partial_line and len(lines) < num_lines:
                lines.append(partial_line.rstrip('\n'))
                bytes_consumed += len(partial_line.encode(encoding))
        new_offset = offset + bytes_consumed
        return lines, new_offset

    async def read_stdout_lines(self, num_lines: int = DEFAULT_LOG_LINES) -> List[str]:
        """
        Reads up to 'num_lines' of complete lines from the stdout log file,
        starting from the current 'stdout_offset'. Advances the 'stdout_offset'
        past the bytes of the lines returned.

        Args:
            num_lines: The maximum number of complete lines to read.

        Returns:
            A list of strings, each representing a line read.
        """
        async with self._lock:
            return await self._read_stdout_lines(num_lines)

    async def _read_stdout_lines(self, num_lines: int = DEFAULT_LOG_LINES) -> List[str]:
        """
        Internal implementation of read_stdout_lines logic.
        Called by read_stdout_lines() after acquiring the lock.
        """
        try:
            lines, new_offset = await self.read_log_lines(
                self.stdout_log_path, self.stdout_offset, num_lines
            )
            # Only update offset if we got some lines
            self.stdout_offset = new_offset
            return lines
        except Exception as e:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Error reading stdout lines: {e}',
                exc_info=True,
            )
            raise

    async def read_stderr_lines(self, num_lines: int = DEFAULT_LOG_LINES) -> List[str]:
        """
        Reads up to 'num_lines' of complete lines from the stderr log file,
        starting from the current 'stderr_offset'. Advances the 'stderr_offset'
        past the bytes of the lines returned.

        Args:
            num_lines: The maximum number of complete lines to read.

        Returns:
            A list of strings, each representing a line read.
        """
        async with self._lock:
            return await self._read_stderr_lines(num_lines)

    async def _read_stderr_lines(self, num_lines: int = DEFAULT_LOG_LINES) -> List[str]:
        """
        Internal implementation of read_stderr_lines logic.
        Called by read_stderr_lines() after acquiring the lock.
        """
        try:
            lines, new_offset = await self.read_log_lines(
                self.stderr_log_path, self.stderr_offset, num_lines
            )
            # Only update offset if we got some lines
            self.stderr_offset = new_offset
            return lines
        except Exception as e:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Error reading stderr lines: {e}',
                exc_info=True,
            )
            raise

    async def tail_log_file(self, log_path: str | None, num_lines: int) -> List[str]:
        """
        Helper method to read the last lines from a log file.
        Uses a non-blocking approach by reading in chunks rather than lines.

        Args:
            log_path: Path to the log file
            num_lines: Maximum number of lines to return from the end of the file

        Returns:
            List of strings representing the last lines from the file
        """
        if not (0 < num_lines <= MAX_LOG_LINES):
            raise ValueError(f'num_lines must be between 1 and {MAX_LOG_LINES}')

        if not log_path or not await aiofiles.os.path.exists(log_path):
            return []

        # Get file size to determine how much to read
        file_size = await aiofiles.os.path.getsize(log_path)
        if file_size == 0:
            return []

        CHUNK_SIZE = min(8192, file_size)  # 8KB chunks or file size if smaller
        all_lines = []

        async with aiofiles.open(
            log_path, mode='r', encoding='utf-8', errors='replace'
        ) as f:
            # Start by reading the entire file in chunks
            content = ''
            await f.seek(0)

            while True:
                chunk = await f.read(CHUNK_SIZE)
                if not chunk:
                    break
                content += chunk

            # Split the content into lines and take the last num_lines
            all_lines = content.splitlines()

            # Filter out empty lines
            all_lines = [line for line in all_lines if line.strip()]

            # Return only the last num_lines
            return all_lines[-num_lines:] if all_lines else []

    async def tail_stdout(self, num_lines: int = DEFAULT_LOG_LINES) -> List[str]:
        """
        Returns the last num_lines from the stdout log file.

        Args:
            num_lines: The maximum number of lines to return from the end of the file.

        Returns:
            A list of strings representing the last lines from stdout.
        """
        try:
            return await self.tail_log_file(self.stdout_log_path, num_lines)
        except Exception as e:
            logging.error(
                f'[{self.identifier}_{self.run_id}] Error tailing stdout: {e}',
                exc_info=True,
            )
            raise

    async def tail_stderr(self, num_lines: int = DEFAULT_LOG_LINES) -> List[str]:
        """
        Returns the last num_lines from the stderr log file.

        Args:
            num_lines: The maximum number of lines to return from the end of the file.

        Returns:
            A list of strings representing the last lines from stderr.
        """
        try:
            return await self.tail_log_file(self.stderr_log_path, num_lines)
        except Exception as e:
            logging.error(
                f'[{self.identifier}] Error tailing stderr: {e}', exc_info=True
            )
            raise

    async def get_full_stdout(self) -> str:
        """Reads and returns the entire content of the stdout log file."""
        try:
            if not self.stdout_log_path or not await aiofiles.os.path.exists(
                self.stdout_log_path
            ):
                return ''

            async with aiofiles.open(
                self.stdout_log_path, mode='r', encoding='utf-8', errors='replace'
            ) as f:
                return await f.read()
        except Exception as e:
            logging.error(
                f'[{self.identifier}] Error reading full stdout log: {e}', exc_info=True
            )
            raise

    async def get_full_stderr(self) -> str:
        """Reads and returns the entire content of the stderr log file."""
        try:
            if not self.stderr_log_path or not await aiofiles.os.path.exists(
                self.stderr_log_path
            ):
                return ''

            async with aiofiles.open(
                self.stderr_log_path, mode='r', encoding='utf-8', errors='replace'
            ) as f:
                return await f.read()
        except Exception as e:
            logging.error(
                f'[{self.identifier}] Error reading full stderr log: {e}', exc_info=True
            )
            raise
