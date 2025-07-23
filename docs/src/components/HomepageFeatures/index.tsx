import type {ReactNode} from 'react';
import {Zap} from 'lucide-react';
import { SiStreamlit, SiJupyter } from '@icons-pack/react-simple-icons';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Icon: React.ComponentType<{className?: string}>;
  iconType: string;
  description: ReactNode;
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
      </div>
    </section>
  );
}
