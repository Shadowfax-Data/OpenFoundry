# OpenFoundry

**The fastest way to build data products with AI.**

OpenFoundry is a comprehensive platform that enables developers and data scientists to rapidly build, deploy, and manage data applications using AI-powered agents. It provides a modern web interface, secure sandbox environments, and seamless integration with popular data warehouses and analytics platforms.

## 🚀 Features

### Core Capabilities
- **AI-Powered App Development**: Build interactive Streamlit applications using intelligent agents
- **Data Connection Management**: Connect to Snowflake, Databricks, and other data sources
- **Secure Sandbox Environment**: Isolated Docker containers for safe code execution
- **Run Locally on Private Data**: Deploy and operate OpenFoundry entirely on your own infrastructure, ensuring your data never leaves your environment

### Data Connections
- **Snowflake**: Full support for Snowflake data warehouse connections
- **Databricks**: Connect to Databricks SQL endpoints
- **BigQuery**: Coming soon
- **Clickhouse**: Coming soon
- **Postgres**: Coming soon
- **Extensible Architecture**: Easy to add new connection types

## 📦 Installation

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker
- Poetry (Python package manager)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shadowfax-Data/OpenFoundry.git
   cd OpenFoundry
   ```

2. **Install dependencies**
   ```bash
   make install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application**
   ```bash
   make run-openfoundry
   ```

The application will be available at `http://localhost:8000`

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/openfoundry

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Logging
LOG_LEVEL=DEBUG

# Storage
STORAGE_DIR=./storage

# Docker
SANDBOX_IMAGE=openfoundry-sandbox:latest
SANDBOX_PORT=8000
```

## 🛠️ Development

### Project Structure
```
OpenFoundry/
├── openfoundry/           # Backend Python application
│   ├── agents/           # AI agent implementations
│   ├── models/           # Database models
│   ├── routers/          # API endpoints
│   └── server.py         # FastAPI application
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Redux state management
│   │   └── types/        # TypeScript type definitions
│   └── package.json
├── sandbox/              # Sandbox environment
├── alembic/              # Database migrations
└── storage/              # File storage
```

### Available Commands

#### Backend Development
```bash
# Start backend server
make start-backend

# Run database migrations
poetry run alembic upgrade head

# Lint and format code
make lint
```

#### Frontend Development
```bash
# Start frontend development server
make start-frontend

# Build frontend for production
make build-frontend

# Lint and format frontend code
make lint-frontend
```

#### Docker Operations
```bash
# Build Docker images
make docker-images
make docker-sandbox-images

# Run full application
make run-openfoundry
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Follow the existing code style and conventions
- Use TypeScript for frontend code
- Add type hints to Python functions
- Write clear commit messages

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests on [GitHub Issues](https://github.com/Shadowfax-Data/OpenFoundry/issues)
- **Discussions**: Join community discussions on [GitHub Discussions](https://github.com/Shadowfax-Data/OpenFoundry/discussions)

## 🏢 About

OpenFoundry is developed by [Shadowfax AI](mailto:founders@shadowfaxdata.com).

---

**Built with ❤️ for the data community**
