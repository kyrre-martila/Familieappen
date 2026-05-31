import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "../../components/AuthForm";
import { LoginFormFields } from "../../components/LoginFormFields";

export default function LoginPage() {
  return (
    <section className="login-screen" aria-labelledby="login-title">
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__light"
        height={492}
        priority
        src="/assets/illustrations/light-shadow.png"
        width={492}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__plants"
        height={420}
        src="/assets/illustrations/plants.png"
        width={420}
      />

      <div className="login-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <div className="login-screen__header">
          <h1 className="login-screen__title" id="login-title">Velkommen tilbake</h1>
          <p className="login-screen__subtitle">Logg inn for å fortsette med familien din.</p>
        </div>

        <AuthForm mode="login" submitLabel="Logg inn" submittingLabel="Logger inn…" submitTo="/dashboard">
          <LoginFormFields />
          <Link className="login-screen__forgot-link" href="/forgot-password">Glemt passord?</Link>
        </AuthForm>

        <div className="login-screen__divider" aria-hidden="true">
          <span />
          <p>eller</p>
          <span />
        </div>

        <p className="login-screen__register">
          Har du ikke konto? <Link href="/register">Registrer deg</Link>
        </p>
      </div>
    </section>
  );
}
