# OpenFoundry

**The fastest way to build data products with AI.**

Everyone wants to own their data — so why trust a black-box AI to operate on it?

While projects like Apache Iceberg give users control over how data is stored, analytics agents and products remain proprietary and opaque. OpenFoundry is an open-source platform for building data products with AI — without giving up control. It’s fully extensible, easy to customize with organization-specific tools, and designed to work transparently on your data, in your environment.

Take back control — not just of your data, but of the agents that work with it.

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
