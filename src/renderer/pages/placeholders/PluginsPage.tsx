import React from "react";
import { useTranslation } from "react-i18next";
import pStyles from "../../styles/pages/PlaceholderPage.module.css";

const PLUGIN_CATALOG = [
  {
    id: "p1",
    name: "Markdown Formatter",
    description:
      "Auto-format pasted Markdown with proper heading levels and list indentation.",
    author: "community",
  },
  {
    id: "p2",
    name: "CSV Prettifier",
    description:
      "Convert raw CSV clipboard data to a clean, aligned table view.",
    author: "community",
  },
  {
    id: "p3",
    name: "URL Expander",
    description:
      "Resolve shortened URLs and replace them with full destinations.",
    author: "community",
  },
  {
    id: "p4",
    name: "Code Highlighter",
    description: "Detect and syntax-highlight pasted code snippets.",
    author: "community",
  },
  {
    id: "p5",
    name: "Translation Bridge",
    description:
      "Translate pasted text to your preferred language via a configurable provider.",
    author: "community",
  },
];

export const PluginsPage: React.FC = () => {
  const { t } = useTranslation();
  const icons = ["MD", "CSV", "URL", "Code", "Lang"];

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>{t("placeholders.plugins_title")}</h2>
      </div>
      <div className={pStyles.pluginBanner}>
        <strong>Plugin system coming soon.</strong> The API is under
        development. Browse the planned plugins below.
      </div>
      <div className={pStyles.list}>
        {PLUGIN_CATALOG.map((plugin, index) => (
          <div key={plugin.id} className={pStyles.pluginCard}>
            <span className={pStyles.pluginIcon}>
              {icons[index % icons.length]}
            </span>
            <div className={pStyles.pluginInfo}>
              <div className={pStyles.pluginName}>{plugin.name}</div>
              <div className={pStyles.pluginDesc}>{plugin.description}</div>
              <span className={pStyles.pluginChip}>
                Planned - {plugin.author}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
