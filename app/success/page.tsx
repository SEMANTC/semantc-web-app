import { FaCheckCircle } from "react-icons/fa";

export default function SuccessPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>
        Welcome aboard! <FaCheckCircle color="green" />
      </h1>
      <p>Your resources are being set up.</p>
    </div>
  );
}