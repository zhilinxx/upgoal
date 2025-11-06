import React, { useEffect, useState } from "react";
import { FaChevronRight, FaChevronDown } from "react-icons/fa";
import useTheme from "../hooks/useTheme";
import "../styles/settings.css";        

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [openTheme, setOpenTheme] = useState(!isMobile);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setOpenTheme(true);   // keep expanded on desktop
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleThemeSection = () => setOpenTheme((x) => !x);

  return (
    <div className="settings-container">
      {/* Title is its own row */}
      <div className="settings-page-title">
        <h2>Settings</h2>
      </div>

      <div className="settings-inner">
        {/* THEME card */}
        <div className="settings-section">
          {isMobile ? (
            <div className="settings-section-header" onClick={toggleThemeSection}>
              <h3>Theme</h3>
              {openTheme ? (
                <FaChevronDown className="settings-chevron-icon" />
              ) : (
                <FaChevronRight className="settings-chevron-icon" />
              )}
            </div>
          ) : (
            <h3>Theme</h3>
          )}

          {(!isMobile || openTheme) && (
            <div className="settings-section-content">
              <hr />
              <div className="settings-radio-row">
                <label className="settings-inline-label">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme === "light"}
                    onChange={() => setTheme("light")}
                  />
                  Light
                </label>

                <label className="settings-inline-label">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => setTheme("dark")}
                  />
                  Dark
                </label>
              </div>

              <p>
                Current: <strong>{theme}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
