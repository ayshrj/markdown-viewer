import React from "react";

type MDLensIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
};

const MDLensIcon: React.FC<MDLensIconProps> = ({
  size = 1024,
  width,
  height,
  ...props
}) => {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 1024 1024"
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

      <rect width="1024" height="1024" rx="220" fill="#F7F6F2" />

      {/* Soft app-icon inner glow */}
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="180"
        fill="#FBFAF7"
      />

      {/* Document */}
      <path
        d="M314 184H625L738 297V669C738 702.137 711.137 729 678 729H314C280.863 729 254 702.137 254 669V244C254 210.863 280.863 184 314 184Z"
        fill="#FFFDFC"
        stroke="#263036"
        strokeWidth="18"
        strokeLinejoin="round"
      />

      {/* Folded corner */}
      <path
        d="M625 185V267C625 283.569 638.431 297 655 297H737"
        stroke="#263036"
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
        fill="#FFFDFC"
        stroke="#263036"
        strokeWidth="10"
      />

      <text
        x="382"
        y="321"
        textAnchor="middle"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="58"
        fontWeight="800"
        fill="#263036"
      >
        MD
      </text>

      {/* Split divider */}
      <line
        x1="501"
        y1="238"
        x2="501"
        y2="667"
        stroke="#D8DADD"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Raw markdown side */}
      <g
        fontFamily="'SFMono-Regular', Menlo, Consolas, monospace"
        fontSize="27"
        fill="#263036"
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
        fill="#263036"
      >
        H1
      </text>

      <line
        x1="540"
        y1="397"
        x2="663"
        y2="397"
        stroke="#4D86B5"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <line
        x1="540"
        y1="450"
        x2="694"
        y2="450"
        stroke="#D8DADD"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <line
        x1="540"
        y1="486"
        x2="694"
        y2="486"
        stroke="#D8DADD"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <line
        x1="540"
        y1="522"
        x2="640"
        y2="522"
        stroke="#D8DADD"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <circle cx="546" cy="581" r="7" fill="#263036" />

      <line
        x1="573"
        y1="581"
        x2="636"
        y2="581"
        stroke="#D8DADD"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <circle cx="546" cy="622" r="7" fill="#263036" />

      <line
        x1="573"
        y1="622"
        x2="616"
        y2="622"
        stroke="#D8DADD"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Bottom brand text */}
      <text
        x="512"
        y="842"
        textAnchor="middle"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="86"
        fontWeight="750"
        letterSpacing="-2"
      >
        <tspan fill="#263036">MD</tspan>
        <tspan fill="#4D86B5">Lens</tspan>
      </text>
    </svg>
  );
};

export default MDLensIcon;
