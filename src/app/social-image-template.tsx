import * as React from "react";

import { SITE_DESCRIPTION, SITE_HOST, SITE_TITLE } from "@/lib/site";

function SocialDocumentIcon() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: 330,
        height: 420,
        borderRadius: 42,
        border: "12px solid #EAF1FF",
        background: "#FFFDFC",
        boxShadow: "0 34px 80px rgba(0, 0, 0, 0.32)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -1,
          top: -1,
          width: 86,
          height: 86,
          background: "linear-gradient(135deg, #DCEAFF 0%, #A9C9FF 100%)",
          clipPath: "polygon(100% 0, 0 0, 100% 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 34,
          top: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 102,
          height: 64,
          borderRadius: 16,
          border: "7px solid #263036",
          color: "#263036",
          fontSize: 38,
          fontWeight: 900,
        }}
      >
        MD
      </div>
      <div
        style={{
          position: "absolute",
          left: 164,
          top: 38,
          width: 6,
          height: 332,
          borderRadius: 999,
          background: "#D8DADD",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 34,
          top: 142,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          color: "#263036",
          fontFamily: "monospace",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex" }}># Notes</div>
        <div style={{ display: "flex" }}>**Bold**</div>
        <div style={{ display: "flex" }}>- Item</div>
        <div style={{ display: "flex" }}>```</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 196,
          top: 134,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#263036",
            fontSize: 52,
            fontWeight: 900,
          }}
        >
          H1
        </div>
        {[92, 104, 82, 58].map((lineWidth, index) => (
          <div
            key={lineWidth}
            style={{
              display: "flex",
              width: lineWidth,
              height: 12,
              borderRadius: 999,
              background: index === 0 ? "#8AB4FF" : "#D8DADD",
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: 30,
          bottom: 28,
          display: "flex",
          color: "#263036",
          fontSize: 34,
          fontWeight: 900,
        }}
      >
        MD<span style={{ color: "#8AB4FF" }}>Lens</span>
      </div>
    </div>
  );
}

export function SocialImageTemplate() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 86% 12%, rgba(138,180,255,0.42), transparent 31%), radial-gradient(circle at 8% 92%, rgba(255,255,255,0.09), transparent 27%), linear-gradient(135deg, #171716 0%, #20201F 46%, #1B2A3F 100%)",
        color: "#F5F4EF",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 30,
          borderRadius: 54,
          border: "1px solid rgba(238, 238, 234, 0.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -160,
          top: -170,
          width: 540,
          height: 540,
          borderRadius: 999,
          background: "rgba(138,180,255,0.13)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -210,
          bottom: -250,
          width: 620,
          height: 620,
          borderRadius: 999,
          background: "rgba(255,255,255,0.055)",
        }}
      />

      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "70px 78px",
          justifyContent: "space-between",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            maxWidth: 710,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                display: "flex",
                color: "#8AB4FF",
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Markdown Reader
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 900,
                letterSpacing: "-0.065em",
                lineHeight: 0.93,
              }}
            >
              {SITE_TITLE}
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 680,
                color: "#D8D8CF",
                fontSize: 31,
                lineHeight: 1.42,
              }}
            >
              {SITE_DESCRIPTION}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              maxWidth: 780,
            }}
          >
            {["Multi-file", "GFM", "Mermaid", "Math", "Syntax highlight"].map(label => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "11px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(238, 238, 234, 0.14)",
                  background: "rgba(255,255,255,0.065)",
                  color: "#F3F3EE",
                  fontSize: 19,
                  fontWeight: 750,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 370,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 350,
              height: 350,
              borderRadius: 999,
              background: "rgba(138,180,255,0.18)",
              filter: "blur(2px)",
            }}
          />
          <SocialDocumentIcon />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 9,
          background: "linear-gradient(90deg, #8AB4FF 0%, #4D86B5 55%, #263036 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 44,
          bottom: 28,
          display: "flex",
          color: "#9FBFEF",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
        }}
      >
        {SITE_HOST}
      </div>
    </div>
  );
}
