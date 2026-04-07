function PaymentLogo({ methodId }) {
  const logos = {
    gopay: (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#00AED6" />
          <circle cx="22" cy="24" r="9" fill="#ffffff" opacity="0.96" />
          <circle cx="22" cy="24" r="4.6" fill="#00AED6" />
          <path
            d="M34 17h12.5a4.5 4.5 0 0 1 4.5 4.5v5A4.5 4.5 0 0 1 46.5 31H34v-4.2h11.4a1.4 1.4 0 0 0 1.4-1.4v-2.8a1.4 1.4 0 0 0-1.4-1.4H34Z"
            fill="#ffffff"
          />
        </g>
      </svg>
    ),
    ovo: (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#4C1D95" />
          <circle cx="24" cy="24" r="8" fill="none" stroke="#ffffff" strokeWidth="4" />
          <circle cx="36" cy="24" r="8" fill="none" stroke="#ffffff" strokeWidth="4" />
          <circle cx="48" cy="24" r="8" fill="none" stroke="#ffffff" strokeWidth="4" />
        </g>
      </svg>
    ),
    dana: (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#118EEA" />
          <path
            d="M23 15h12.5c7.2 0 12.5 4 12.5 9s-5.3 9-12.5 9H23Zm11.2 13.2c4.4 0 7.5-1.8 7.5-4.2s-3.1-4.2-7.5-4.2h-4.8v8.4Z"
            fill="#ffffff"
          />
          <path d="M47 15h4v18h-4z" fill="#ffffff" opacity="0.9" />
        </g>
      </svg>
    ),
    shopeepay: (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#F97316" />
          <path
            d="M24 18h24v12.5a4.5 4.5 0 0 1-4.5 4.5h-15A4.5 4.5 0 0 1 24 30.5Z"
            fill="#ffffff"
          />
          <path
            d="M29 18a7 7 0 0 1 14 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M37.5 23.3c-1.7-1.1-4.7-.6-4.7 1.5 0 3 7.4 1.5 7.4 4.8 0 2.1-2 3.4-4.6 3.4-1.8 0-3.5-.5-4.8-1.5"
            fill="none"
            stroke="#F97316"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    ),
    'bca-va': (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#1D4ED8" />
          <path
            d="M17 31c6-5.3 14-8 22-8 5.5 0 10.8 1.2 16 3.8M20 19.5c4.8 2.3 9.7 3.5 14.7 3.5 6.3 0 12.2-1.9 17.9-5.8"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="25" cy="24" r="2.7" fill="#ffffff" />
          <circle cx="35.5" cy="24" r="2.7" fill="#ffffff" />
          <circle cx="46" cy="24" r="2.7" fill="#ffffff" />
        </g>
      </svg>
    ),
    'mandiri-va': (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#0F3D91" />
          <path
            d="M17 25c4.5-5.4 9.5-8.1 15-8.1 5.5 0 10.5 2.7 15 8.1 4.2-3.6 7.9-5.4 11-5.4"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    ),
    'bni-va': (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#ffffff" />
          <rect x="2" y="2" width="68" height="44" rx="12" fill="#ffffff" stroke="#E5E7EB" />
          <path
            d="M18 32 30 16h8L26 32Z"
            fill="#16A34A"
          />
          <path
            d="M34 32 46 16h10L44 32Z"
            fill="#F97316"
          />
        </g>
      </svg>
    ),
    'bri-va': (
      <svg viewBox="0 0 80 56" aria-hidden="true">
        <g transform="translate(4 4)">
          <rect width="72" height="48" rx="14" fill="#1E40AF" />
          <path
            d="M22 15h13.5c4.7 0 8.5 3.8 8.5 8.5S40.2 32 35.5 32H22Zm4.2 4.3v8.4h8.6a4.2 4.2 0 1 0 0-8.4Z"
            fill="#ffffff"
          />
          <rect x="46" y="15" width="4.2" height="17" rx="2.1" fill="#ffffff" />
        </g>
      </svg>
    ),
  };

  return (
    <span className="payment-method-logo" aria-hidden="true">
      {logos[methodId] || logos.gopay}
    </span>
  );
}

export default PaymentLogo;
