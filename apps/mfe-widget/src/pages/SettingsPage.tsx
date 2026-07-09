import { Link } from "react-router";
import { useState } from "react";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    if (import.meta.env.DEV) {
      console.log("[Settings] Saved:", { theme, autoSave, notifications });
    }
    alert("Settings saved successfully!");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to=".." style={{ color: "#3b82f6", textDecoration: "none" }}>
          ← Back to Dashboard
        </Link>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "bold" }}>
        Settings
      </h2>
      
      <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
        Configure your widget preferences.
      </p>

      <div style={{ 
        padding: "2rem", 
        background: "white", 
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        {/* Theme Setting */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
            Theme
          </label>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value as "light" | "dark")}
            style={{ 
              padding: "0.5rem", 
              borderRadius: "4px", 
              border: "1px solid #d1d5db",
              width: "100%",
              maxWidth: "300px"
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        {/* Auto-save Setting */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              style={{ width: "1rem", height: "1rem" }}
            />
            <span style={{ fontWeight: "600" }}>Enable auto-save</span>
          </label>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginLeft: "1.5rem" }}>
            Automatically save changes as you make them
          </p>
        </div>

        {/* Notifications Setting */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              style={{ width: "1rem", height: "1rem" }}
            />
            <span style={{ fontWeight: "600" }}>Enable notifications</span>
          </label>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginLeft: "1.5rem" }}>
            Receive notifications about widget updates
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Save Settings
        </button>
      </div>

      {import.meta.env.DEV && (
        <div style={{ 
          marginTop: "2rem",
          padding: "1rem", 
          background: "#f3f4f6", 
          borderRadius: "8px",
          fontSize: "0.875rem"
        }}>
          <strong>Dev Info:</strong> Current settings: theme={theme}, autoSave={String(autoSave)}, 
          notifications={String(notifications)}
        </div>
      )}
    </div>
  );
}
