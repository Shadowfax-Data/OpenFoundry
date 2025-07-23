---
sidebar_position: 1
---

# Welcome

Welcome to OpenFoundry, a platform for analysts and non-technical users to build powerful data products with the help of AI agents.
OpenFoundry helps you build rich interactive streamlit applications and Notebooks on top of your private data. OpenFoundry takes care of
all the code implementation and data connections underneath.

## Core Features

- **AI-powered App Development:** Build interative Streamlit applications and Notebooks with intelligent AI agents.
- **Data Connection Management:** Connect to Snowflake. Databricks, and many other datasources
- **Secure Sandbox Environment:** Isolated Docker containers for safe code execution
- **Run locally on Private Data:** Deploy and operate OpenFoundry entirely on your own infrastructure, ensuring your data never leaves your environment

### Data Connections

- Snowflake
- Databricks
- ClickHouse
- BigQuery
- PostgreSQL


## Installation

### Prerequsites
- Python 3.12+
- Node.js 20+
- Docker
- Poetry (Python package manager)
- Git

### Quick Start

1. Clone the repository
```
git clone https://github.com/Shadowfax-Data/OpenFoundry.git
cd OpenFoundry
```

2. Install Dependencies
```
make install
```

3. Set up environment variables
```
cp .env.example .env
# Edit .env with your configuration
```

4. Start the Application
```
make run-openfoundry
```

The application will be running on http://localhost:8000
