import "./Button.css";
export default function PrimaryButton({ children, className = "", ...rest }) {
  return (
    <button className={`btn ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}