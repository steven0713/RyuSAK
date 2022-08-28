import React from "react";
import "./loading.css";
import useTranslation from "../../i18n/I18nService";

const LoadingComponent = () => {
  const { t } = useTranslation();

  return (
    <div className="centred-container">
      <div className="ripple-container">
        <span className="loading-ripple" />
      </div>
      <h3>{t("loading_data")}</h3>
    </div>
  );
};

export default LoadingComponent;
