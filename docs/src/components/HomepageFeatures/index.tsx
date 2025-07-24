import type {ReactNode} from 'react';
import { SiStreamlit, SiJupyter , SiSnowflake, SiDatabricks, SiClickhouse, SiGooglebigquery, SiPostgresql} from '@icons-pack/react-simple-icons';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Icon: React.ComponentType<{className?: string}>;
  iconType?: string;
  description?: ReactNode;
  linkTo?: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Streamlit App Builder',
    Icon: SiStreamlit,
    iconType: 'streamlit',
    description: (
      <>
        Create interactive Streamlit applications with ease and
        deploy instantly with secure warehouse access.
      </>
    ),
    linkTo: '/docs/category/tutorial---apps',
  },
  {
    title: 'Notebook App Builder',
    Icon: SiJupyter,
    iconType: 'jupyter',
    description: (
      <>
        Leverage AI assistance to generate code, visualize data, and streamline
        your analysis with an interactive notebook interface.
      </>
    ),
    linkTo: '/docs/category/tutorial---notebooks',
  },
];

const DataConnections: FeatureItem[] = [
  {
    title: 'Snowflake',
    Icon: SiSnowflake,
    iconType: 'snowflake',
  },
  {
    title: 'Databricks',
    Icon: SiDatabricks,
    iconType: 'databricks',
  },
  {
    title: 'Clickhouse',
    Icon: SiClickhouse,
    iconType: 'clickhouse',
  },
  {
    title: 'Google BigQuery',
    Icon: SiGooglebigquery,
    iconType: 'googlebigquery',
  },
  {
    title: 'PostgreSQL',
    Icon: SiPostgresql,
    iconType: 'postgresql',
  },
];

function Feature({title, Icon, iconType, description, linkTo}: FeatureItem) {
  const cardContent = (
    <>
      <div className={styles.featureIconContainer}>
        <Icon className={styles.featureSvg} data-icon={iconType} />
      </div>
      <div className={styles.featureContent}>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </>
  );

  return (
    <div className={clsx('col col--6')}>
      {linkTo ? (
        <Link to={linkTo} className={styles.featureCardLink}>
          <div className={clsx(styles.featureCard, styles.clickableCard)}>
            {cardContent}
          </div>
        </Link>
      ) : (
        <div className={styles.featureCard}>
          {cardContent}
        </div>
      )}
    </div>
  );
}

function DataConnectionIcon({title, Icon, iconType}: FeatureItem) {
  return (
    <div className={styles.dataConnectionItem}>
      <div className={styles.dataConnectionIcon}>
        <Icon className={styles.dataConnectionSvg} data-icon={iconType} />
      </div>
      <span className={styles.dataConnectionTitle}>{title}</span>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featureHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Why Choose OpenFoundry?
          </Heading>
          <p className={styles.sectionSubtitle}>
            Everything you need to build, deploy, and scale your data applications
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>

        <div className={styles.dataConnectionsSection}>
          <Heading as="h3" className={styles.dataConnectionsTitle}>
            Supported Data Connections
          </Heading>
          <div className={styles.dataConnectionsGrid}>
            {DataConnections.map((props, idx) => (
              <DataConnectionIcon key={idx} {...props} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
