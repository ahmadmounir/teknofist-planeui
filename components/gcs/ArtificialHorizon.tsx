interface ArtificialHorizonProps {
  pitch: number  // degrees, positive = nose up
  roll: number   // degrees, positive = right bank
  size?: number
}

export default function ArtificialHorizon({ pitch, roll, size = 80 }: ArtificialHorizonProps) {
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2 - 4

  // Sky/ground split offset from centre based on pitch
  const pitchOffset = (pitch / 90) * r * 0.7

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-full overflow-hidden"
      aria-label={`Artificial horizon: pitch ${pitch}° roll ${roll}°`}
    >
      <defs>
        <clipPath id="horizon-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <radialGradient id="sky-grad" cx="50%" cy="30%">
          <stop offset="0%" stopColor="#0a2a3a" />
          <stop offset="100%" stopColor="#05111c" />
        </radialGradient>
        <radialGradient id="ground-grad" cx="50%" cy="70%">
          <stop offset="0%" stopColor="#2a1a05" />
          <stop offset="100%" stopColor="#1a1005" />
        </radialGradient>
      </defs>

      {/* Rotated group for roll */}
      <g
        transform={`rotate(${roll}, ${cx}, ${cy})`}
        clipPath="url(#horizon-clip)"
      >
        {/* Sky */}
        <rect x={0} y={0} width={size} height={size} fill="url(#sky-grad)" />
        {/* Ground - shifted by pitch */}
        <rect
          x={0}
          y={cy - pitchOffset}
          width={size}
          height={size}
          fill="url(#ground-grad)"
        />
        {/* Horizon line */}
        <line
          x1={0}
          y1={cy - pitchOffset}
          x2={size}
          y2={cy - pitchOffset}
          stroke="oklch(0.75 0.18 192)"
          strokeWidth={1}
          opacity={0.9}
        />
        {/* Pitch marks */}
        {[-10, -5, 5, 10].map((deg) => {
          const offset = cy - pitchOffset - (deg / 90) * r * 0.7
          const w = deg % 10 === 0 ? r * 0.5 : r * 0.3
          return (
            <line
              key={deg}
              x1={cx - w / 2}
              y1={offset}
              x2={cx + w / 2}
              y2={offset}
              stroke="oklch(0.75 0.18 192)"
              strokeWidth={0.5}
              opacity={0.5}
            />
          )
        })}
      </g>

      {/* Fixed aircraft symbol */}
      <g clipPath="url(#horizon-clip)">
        {/* Centre dot */}
        <circle cx={cx} cy={cy} r={1.5} fill="oklch(0.68 0.22 45)" />
        {/* Wing left */}
        <line x1={cx - r * 0.4} y1={cy} x2={cx - r * 0.15} y2={cy} stroke="oklch(0.68 0.22 45)" strokeWidth={2} />
        {/* Wing right */}
        <line x1={cx + r * 0.15} y1={cy} x2={cx + r * 0.4} y2={cy} stroke="oklch(0.68 0.22 45)" strokeWidth={2} />
      </g>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(0.75 0.18 192 / 0.4)" strokeWidth={1} />

      {/* Roll indicator triangle */}
      <polygon
        points={`${cx},${4} ${cx - 4},${12} ${cx + 4},${12}`}
        fill="oklch(0.68 0.22 45)"
        opacity={0.9}
      />
    </svg>
  )
}
