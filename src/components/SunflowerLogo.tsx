interface SunflowerLogoProps {
  className?: string;
}

export function SunflowerLogo({ className = 'h-10 w-10' }: SunflowerLogoProps) {
  const outerAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const innerAngles = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];
  const seedAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Camada traseira de pétalas minimalistas */}
      <g>
        {innerAngles.map((deg) => (
          <path
            key={`back-${deg}`}
            d="M32 6C34.6 11.2 34.8 17 32 21.8C29.2 17 29.4 11.2 32 6Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>

      {/* Camada principal de pétalas com traço limpo e elegante */}
      <g>
        {outerAngles.map((deg) => (
          <path
            key={`front-${deg}`}
            d="M32 4C35.2 10.2 35.4 17.2 32 22.2C28.6 17.2 28.8 10.2 32 4Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>

      {/* Miolo minimalista em preto e branco */}
      <circle
        cx="32"
        cy="32"
        r="10.5"
        fill="#000000"
        stroke="#000000"
        strokeWidth="1.5"
      />
      <circle
        cx="32"
        cy="32"
        r="7.5"
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth="1.25"
      />

      {/* Sementes geométricas discretas */}
      <circle cx="32" cy="32" r="1.4" fill="#000000" />
      {seedAngles.map((deg) => (
        <circle
          key={`seed-${deg}`}
          cx="32"
          cy="27.3"
          r="0.95"
          fill="#000000"
          transform={`rotate(${deg} 32 32)`}
        />
      ))}
    </svg>
  );
}
