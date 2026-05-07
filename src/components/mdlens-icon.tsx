import React from "react";

type MDLensIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
  showSubtitle?: boolean;
};

const MDLensIcon: React.FC<MDLensIconProps> = ({
  size = 1024,
  showSubtitle = true,
  width,
  height,
  ...props
}) => {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox={showSubtitle ? "0 0 1024 1024" : "145 96 702 702"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="title desc"
      {...props}
    >
      <title id="title">MDLens App Icon</title>

      <desc id="desc">
        Minimal Markdown reader icon with a document, split preview, and
        magnifying lens.
      </desc>

      <rect width="1024" height="1024" rx="220" fill="var(--mdlens-icon-bg)" />

      {/* Soft app-icon inner glow */}
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="180"
        fill="var(--mdlens-icon-inner)"
      />

      {/* Document */}
      <path
        d="M314 184H625L738 297V669C738 702.137 711.137 729 678 729H314C280.863 729 254 702.137 254 669V244C254 210.863 280.863 184 314 184Z"
        fill="var(--mdlens-icon-paper)"
        stroke="var(--mdlens-icon-ink)"
        strokeWidth="18"
        strokeLinejoin="round"
      />

      {/* Folded corner */}
      <path
        d="M625 185V267C625 283.569 638.431 297 655 297H737"
        stroke="var(--mdlens-icon-ink)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* MD badge */}
      <rect
        x="304"
        y="254"
        width="156"
        height="96"
        rx="18"
        fill="var(--mdlens-icon-paper)"
        stroke="var(--mdlens-icon-ink)"
        strokeWidth="10"
      />

      <text
        x="382"
        y="321"
        textAnchor="middle"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="58"
        fontWeight="800"
        fill="var(--mdlens-icon-ink)"
      >
        MD
      </text>

      {/* Split divider */}
      <line
        x1="501"
        y1="238"
        x2="501"
        y2="667"
        stroke="var(--mdlens-icon-rule)"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Raw markdown side */}
      <g
        fontFamily="'SFMono-Regular', Menlo, Consolas, monospace"
        fontSize="27"
        fill="var(--mdlens-icon-ink)"
      >
        <text x="310" y="425">
          # Heading
        </text>

        <text x="310" y="480">
          **Bold**
        </text>

        <text x="310" y="535">
          *Italic*
        </text>

        <text x="310" y="590">
          - Item
        </text>

        <text x="310" y="645">
          {`\`\`\``}
        </text>
      </g>

      {/* Rendered preview side */}
      <text
        x="540"
        y="357"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="64"
        fontWeight="800"
        fill="var(--mdlens-icon-ink)"
      >
        H1
      </text>

      <line
        x1="540"
        y1="397"
        x2="663"
        y2="397"
        stroke="var(--mdlens-icon-accent)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <line
        x1="540"
        y1="450"
        x2="694"
        y2="450"
        stroke="var(--mdlens-icon-rule)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <line
        x1="540"
        y1="486"
        x2="694"
        y2="486"
        stroke="var(--mdlens-icon-rule)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <line
        x1="540"
        y1="522"
        x2="640"
        y2="522"
        stroke="var(--mdlens-icon-rule)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <circle cx="546" cy="581" r="7" fill="var(--mdlens-icon-ink)" />

      <line
        x1="573"
        y1="581"
        x2="636"
        y2="581"
        stroke="var(--mdlens-icon-rule)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <circle cx="546" cy="622" r="7" fill="var(--mdlens-icon-ink)" />

      <line
        x1="573"
        y1="622"
        x2="616"
        y2="622"
        stroke="var(--mdlens-icon-rule)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {showSubtitle ? (
        <text
          x="512"
          y="842"
          textAnchor="middle"
          fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontSize="86"
          fontWeight="750"
          letterSpacing="-2"
        >
          <tspan fill="var(--mdlens-icon-ink)">MD</tspan>
          <tspan fill="var(--mdlens-icon-accent)">Lens</tspan>
        </text>
      ) : null}
    </svg>
  );
};

export default MDLensIcon;
