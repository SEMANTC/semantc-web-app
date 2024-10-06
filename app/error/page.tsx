import { FaExclamationTriangle } from "react-icons/fa";

export default function ErrorPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>
        Something went wrong <FaExclamationTriangle color="red" />
      </h1>
      <p>Please try the authentication process again.</p>
    </div>
  );
}