const toneMap = {
  default: "rgba(255,255,255,0.06)",
  primary: "rgba(242,109,43,0.18)",
  secondary: "rgba(217,0,255,0.2)",
  tertiary: "rgba(255,0,122,0.2)",
  success: "rgba(89,217,142,0.2)",
  danger: "rgba(255,95,122,0.2)",
};

export default function Badge({ children, tone = "default" }) {
  return (
    <span
      className="chip"
      style={{
        background: toneMap[tone] || toneMap.default,
      }}
    >
      {children}
    </span>
  );
}
