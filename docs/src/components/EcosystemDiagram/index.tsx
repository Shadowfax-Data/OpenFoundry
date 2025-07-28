import React from 'react';
import { SiStreamlit, SiJupyter } from '@icons-pack/react-simple-icons';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function EcosystemDiagram() {
  return (
    <div className={styles.ecosystem}>
      <div className={styles.flowContainer}>
        {/* App Visual */}
        <div className={styles.flowCard}>
          <div className={styles.appVisualContainer}>
            <div className={styles.browserWindow}>
              <div className={styles.browserHeader}>
                <div className={styles.browserDots}>
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div className={styles.browserContent}>
                <div className={styles.sidebar}>
                  <div className={styles.sidebarItem}></div>
                  <div className={styles.sidebarItem}></div>
                  <div className={styles.sidebarItem}></div>
                </div>
                <div className={styles.mainContent}>
                  <div className={styles.chart}>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                    <div className={styles.bar}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Line */}
        <div className={styles.connectionLine}></div>

        {/* Streamlit */}
        <div className={styles.flowCard}>
          <div className={styles.iconContainer}>
            <SiStreamlit className={styles.streamlitIcon} />
          </div>
          <h3 className={styles.cardTitle}>Streamlit</h3>
        </div>

        {/* Connection Line */}
        <div className={styles.connectionLine}></div>

        {/* OpenFoundry Core */}
        <div className={styles.coreCard}>
          <div className={styles.coreIconContainer}>
            <img src={useBaseUrl('/img/arcs.svg')} alt="OpenFoundry Logo" className={styles.coreIcon} />
          </div>
          <h3 className={styles.coreTitle}>Open Foundry</h3>
        </div>

        {/* Connection Line */}
        <div className={styles.connectionLine}></div>

        {/* Jupyter */}
        <div className={styles.flowCard}>
          <div className={styles.iconContainer}>
            <SiJupyter className={styles.jupyterIcon} />
          </div>
          <h3 className={styles.cardTitle}>Jupyter</h3>
        </div>

        {/* Connection Line to Notebook Visual */}
        <div className={styles.connectionLineDown}></div>

        {/* Notebook Visual */}
        <div className={styles.notebookCard}>
          <div className={styles.notebookVisualContainer}>
            <div className={styles.notebookWindow}>
              <div className={styles.notebookHeader}>
                <div className={styles.notebookTabs}>
                  <div className={styles.tab}></div>
                  <div className={styles.tab}></div>
                </div>
              </div>
              <div className={styles.notebookContent}>
                <div className={styles.codeCell}>
                  <div className={styles.codeLine}></div>
                  <div className={styles.codeLine}></div>
                </div>
                <div className={styles.outputCell}>
                  <div className={styles.outputChart}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
