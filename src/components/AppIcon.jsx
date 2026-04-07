function AppIcon({ type, className = '' }) {
  const icons = {
    easy: (
      <path
        d="M4.5 12.5 9 17l10.5-10.5M12 4.5a7.5 7.5 0 1 1 0 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8v4.5l3 1.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    spark: (
      <path
        d="m12 3 1.7 4.7L18.5 9l-4.8 1.3L12 15l-1.7-4.7L5.5 9l4.8-1.3ZM18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM5.5 15.5l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1Z"
        fill="currentColor"
      />
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m15 15 4.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
    grid: (
      <path
        d="M5 5h5v5H5zm9 0h5v5h-5zM5 14h5v5H5zm9 0h5v5h-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ),
    products: (
      <>
        <rect x="4.5" y="6" width="15" height="12.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
    heart: (
      <path
        d="M12 20.5 4.9 13.7A4.7 4.7 0 0 1 11.6 7l.4.4.4-.4a4.7 4.7 0 0 1 6.7 6.7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    cart: (
      <>
        <path
          d="M3.5 5.5H6l1.8 8.2a1 1 0 0 0 1 .8h8.1a1 1 0 0 0 1-.8L19.5 8H8.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 19a1 1 0 1 0 0 .01M16.5 19a1 1 0 1 0 0 .01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    star: (
      <path
        d="m12 3.8 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6L7.1 19l.9-5.5-4-3.9 5.5-.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    ),
    stock: (
      <>
        <path
          d="M6 12.5 10 16l8-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
    delivery: (
      <>
        <path
          d="M4.5 7.5h8v6h-8zm8 2h3.4l2.1 2.2v1.8h-5.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 17.5a1 1 0 1 0 0 .01M16 17.5a1 1 0 1 0 0 .01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8.2" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5.5 19c1.4-3 4-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
    wallet: (
      <>
        <path
          d="M5.5 7.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16V9a1.5 1.5 0 0 1 1.5-1.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M15 12.5h5M16.5 12.5a.5.5 0 1 0 0 .01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
    back: (
      <path
        d="M14.5 6.5 9 12l5.5 5.5M19 12H9.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    eye: (
      <>
        <path
          d="M2.8 12s3.3-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.3 5.5-9.2 5.5S2.8 12 2.8 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
    eyeOff: (
      <>
        <path
          d="M4.5 4.5 19.5 19.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.9 6.9a9.2 9.2 0 0 1 2.1-.2c5.9 0 9.2 5.3 9.2 5.3a15.9 15.9 0 0 1-3.4 3.7M6.9 9a14.5 14.5 0 0 0-4.1 3 15.6 15.6 0 0 0 9.2 5.3 9.8 9.8 0 0 0 4.2-.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
    moon: (
      <path
        d="M18.2 14.7A7.5 7.5 0 0 1 9.3 5.8 7.7 7.7 0 1 0 18.2 14.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    menu: (
      <>
        <path
          d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
    close: (
      <>
        <path
          d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
  };

  return (
    <span className={className}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {icons[type] || null}
      </svg>
    </span>
  );
}

export default AppIcon;
