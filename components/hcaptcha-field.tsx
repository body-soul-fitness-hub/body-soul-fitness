"use client";

import Script from "next/script";
import { useEffect, useId } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

declare global {
  interface Window {
    hcaptcha?: { reset: (id?: string) => void };
  }
}

export default function HCaptchaField({ onToken }: { onToken: (token: string) => void }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const callbackName = `hcaptchaCb_${rawId}`;
  const expiredName = `hcaptchaExp_${rawId}`;

  useEffect(() => {
    (window as unknown as Record<string, unknown>)[callbackName] = onToken;
    (window as unknown as Record<string, unknown>)[expiredName] = () => onToken("");
    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      delete (window as unknown as Record<string, unknown>)[expiredName];
    };
  }, [callbackName, expiredName, onToken]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script src="https://js.hcaptcha.com/1/api.js" strategy="afterInteractive" async defer />
      <div className="h-captcha" data-sitekey={SITE_KEY} data-callback={callbackName} data-expired-callback={expiredName} />
    </>
  );
}
