/** Real-iOS device chrome drawn over an iPhone screen: Dynamic Island, status
 *  bar (9:41, cellular / wifi / battery) and the home indicator. Purely visual:
 *  pointer-events pass through to the UI underneath. */

export function IosChrome() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none" }}>
      {/* Dynamic Island */}
      <div
        style={{
          position: "absolute",
          top: 11,
          left: "50%",
          transform: "translateX(-50%)",
          width: 122,
          height: 36,
          borderRadius: 20,
          background: "#000",
        }}
      >
        {/* front camera lens */}
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #1c2b3a 0%, #06090d 55%, #000 100%)",
            boxShadow: "inset 0 0 2px rgba(90,140,190,0.55)",
          }}
        />
      </div>
      {/* status bar: time on the left, radios on the right (iOS style) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px 0 36px",
          boxSizing: "border-box",
          fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: "#fff", mixBlendMode: "difference" }}>9:41</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, filter: "invert(1)", mixBlendMode: "difference" }}>
          {/* cellular bars */}
          <svg width="18" height="12" viewBox="0 0 18 12" fill="#000">
            <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
            <rect x="5" y="5" width="3" height="7" rx="1" />
            <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          {/* wifi */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#000">
            <path d="M8.5 12 5.9 8.9a4.1 4.1 0 0 1 5.2 0L8.5 12Z" />
            <path d="M8.5 6.3c-1.8 0-3.5.7-4.8 1.9L2.2 6.4a9.1 9.1 0 0 1 12.6 0l-1.5 1.8a6.9 6.9 0 0 0-4.8-1.9Z" />
            <path d="M8.5 2.4c-2.8 0-5.5 1.1-7.5 3L-.5 3.6a12.9 12.9 0 0 1 18 0l-1.5 1.8a10.7 10.7 0 0 0-7.5-3Z" transform="translate(0 0.2)" />
          </svg>
          {/* battery */}
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
            <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="#000" strokeOpacity="0.4" />
            <rect x="2" y="2" width="20" height="9" rx="2.4" fill="#000" />
            <path d="M25.5 4.5v4a2.2 2.2 0 0 0 0-4Z" fill="#000" fillOpacity="0.4" />
          </svg>
        </span>
      </div>
      {/* home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 140,
          height: 5,
          borderRadius: 3,
          background: "#fff",
          mixBlendMode: "difference",
        }}
      />
      {/* side buttons: volume up/down (left), action + power (right) */}
      <div style={{ position: "absolute", left: -3, top: 190, width: 3, height: 30, borderRadius: "2px 0 0 2px", background: "#2a2c30" }} />
      <div style={{ position: "absolute", left: -3, top: 240, width: 3, height: 52, borderRadius: "2px 0 0 2px", background: "#2a2c30" }} />
      <div style={{ position: "absolute", left: -3, top: 305, width: 3, height: 52, borderRadius: "2px 0 0 2px", background: "#2a2c30" }} />
      <div style={{ position: "absolute", right: -3, top: 260, width: 3, height: 88, borderRadius: "0 2px 2px 0", background: "#2a2c30" }} />
    </div>
  );
}
