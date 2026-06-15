import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <section className="login-screen" aria-labelledby="register-title">
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
          <h1 className="login-screen__title" id="register-title">Registrer deg</h1>
          <p className="login-screen__subtitle">Lag din konto for å komme i gang.</p>
        </div>

        <RegisterForm initialEmail={email} />

        <p className="login-screen__register">
          Har du allerede en konto? <Link href="/login">Logg inn</Link>
        </p>
      </div>
    </section>
  );
}
