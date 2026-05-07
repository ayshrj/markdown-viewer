import assert from "node:assert/strict";
import test from "node:test";

import { detectLanguageWithScoring } from "@/lib/detect-language-with-scoring";
import {
  scoreAssembly,
  scoreBase64,
  scoreBash,
  scoreC,
  scoreCPlusPlus,
  scoreCSharp,
  scoreCSS,
  scoreDart,
  scoreDockerfile,
  scoreGo,
  scoreHaskell,
  scoreHTML,
  scoreINI,
  scoreJava,
  scoreJavaScript,
  scoreJSON,
  scoreKotlin,
  scoreLaTeX,
  scoreLua,
  scoreMarkdown,
  scoreMatlab,
  scoreMermaid,
  scorePerl,
  scorePHP,
  scorePowerShell,
  scorePython,
  scoreR,
  scoreRegex,
  scoreRuby,
  scoreRust,
  scoreScala,
  scoreSQL,
  scoreSwift,
  scoreTypeScript,
  scoreXML,
  scoreYAML,
} from "@/lib/language-scores";
import type { LanguageScore } from "@/types/language-score";

type Scorer = (text: string) => LanguageScore;

const PLAIN_PROSE =
  "This is a regular paragraph explaining how a reader works. It has words, punctuation, and no code structure.";

const scorerCases: Array<{
  language: string;
  scorer: Scorer;
  strong: string;
  medium: string;
  negative?: string;
}> = [
  {
    language: "Assembly",
    scorer: scoreAssembly,
    strong: "section .text\nglobal _start\n_start:\n  mov eax, 1\n  int 0x80\n  ret",
    medium: "mov eax, 1\nret",
  },
  {
    language: "Base64",
    scorer: scoreBase64,
    strong: "SGVsbG8gV29ybGQhIFRoaXMgaXMgYmFzZTY0Lg==",
    medium: "U29tZSBzaG9ydCB0ZXh0IQ==",
  },
  {
    language: "Bash",
    scorer: scoreBash,
    strong:
      "#!/usr/bin/env bash\nexport NODE_ENV=production\nnpm install\ncurl https://example.com | grep ok\nchmod +x script.sh",
    medium: "git status && npm run build",
  },
  {
    language: "C",
    scorer: scoreC,
    strong: '#include <stdio.h>\n#include <stdlib.h>\nint main(){ printf("hi"); return 0; }',
    medium: 'int main(){ printf("hi"); }',
  },
  {
    language: "C++",
    scorer: scoreCPlusPlus,
    strong: '#include <iostream>\nusing namespace std;\nclass App { public: void run(){ cout << "hi" << endl; } };',
    medium: 'std::cout << "hi";',
  },
  {
    language: "C#",
    scorer: scoreCSharp,
    strong: 'using System;\nnamespace App { class Program { public static void Main(){ Console.WriteLine("Hi"); } } }',
    medium: 'Console.WriteLine("x");\nvar total = 1;',
  },
  {
    language: "CSS",
    scorer: scoreCSS,
    strong: ":root { --brand: #2563eb; }\n@media (min-width: 700px) { .card { display: grid; } }",
    medium: ".btn { color: red; }",
  },
  {
    language: "Dart",
    scorer: scoreDart,
    strong:
      "import 'dart:async';\nvoid main() { final app = App(); print(app); }\nclass App extends StatelessWidget { @override Widget build(context) => Text('x'); }",
    medium: 'void main(){ print("hi"); }',
  },
  {
    language: "Dockerfile",
    scorer: scoreDockerfile,
    strong: 'FROM node:22-alpine AS app\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCMD ["npm", "start"]',
    medium: "RUN npm install\nCOPY . .",
  },
  {
    language: "Go",
    scorer: scoreGo,
    strong: 'package main\nimport ("fmt")\nfunc main(){ msg := "hi"; defer fmt.Println(msg); go work() }',
    medium: 'package main\nfmt.Println("hi")',
  },
  {
    language: "Haskell",
    scorer: scoreHaskell,
    strong: "main :: IO ()\nmain = do\n  value <- pure 1\n  case value of\n    _ -> print value\nwhere",
    medium: 'main :: IO ()\nmain = print "hi"',
  },
  {
    language: "HTML",
    scorer: scoreHTML,
    strong: "<!doctype html><html><head><title>App</title></head><body><main>Hello</main></body></html>",
    medium: "<div>Hello</div>",
  },
  {
    language: "INI",
    scorer: scoreINI,
    strong: "[server]\nhost=localhost\nport=3000",
    medium: "host=localhost",
  },
  {
    language: "Java",
    scorer: scoreJava,
    strong:
      'import java.util.*;\npublic class App { public static void main(String[] args){ System.out.println("Hi"); } @Override public String toString(){ return "App"; } }',
    medium: 'import java.util.List;\nSystem.out.println("x");',
  },
  {
    language: "JavaScript",
    scorer: scoreJavaScript,
    strong:
      'import fs from "node:fs";\nconst name = "MDLens";\nfunction run(){ console.log(name); }\nexport default run;',
    medium: 'const name = "x";',
  },
  {
    language: "JSON",
    scorer: scoreJSON,
    strong: '{"name":"mdlens","features":["markdown","mermaid"],"active":true}',
    medium: '{"name": "mdlens",}',
  },
  {
    language: "Kotlin",
    scorer: scoreKotlin,
    strong:
      'fun main() { val name = "MDLens"; println(name) }\ndata class User(val id: Int)\nwhen(name) { else -> println(name) }',
    medium: 'fun main(){ println("hi") }',
  },
  {
    language: "LaTeX",
    scorer: scoreLaTeX,
    strong: "\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\section{Intro}\n\\end{document}",
    medium: "\\section{Intro}\n$E=mc^2$",
  },
  {
    language: "Lua",
    scorer: scoreLua,
    strong: "local x = 1\nfunction app.run()\n  if x then print(x) end\nend",
    medium: "local x = 1\nprint(x)",
  },
  {
    language: "Markdown",
    scorer: scoreMarkdown,
    strong: "# Title\n\n- Item\n\n```js\nconsole.log('x')\n```\n\n[link](https://example.com)",
    medium: "- item\n- item2\n[link](https://example.com)",
  },
  {
    language: "MATLAB",
    scorer: scoreMatlab,
    strong: 'function y = square(x)\ny = x.^2;\nfprintf("%d", y)\nplot(y)\nend',
    medium: 'disp("hi")\nend',
  },
  {
    language: "Mermaid",
    scorer: scoreMermaid,
    strong: "flowchart TD\n  A[Start] --> B{Ready?}\n  B --> C[Done]",
    medium: "A --> B",
  },
  {
    language: "Perl",
    scorer: scorePerl,
    strong: '#!/usr/bin/perl\nuse strict;\nuse warnings;\nmy $name = "x";\nsub greet { print $name; }',
    medium: 'my $name = "hi";\nprint $name;',
  },
  {
    language: "PHP",
    scorer: scorePHP,
    strong: "<?php\nnamespace App;\nuse DateTime;\nclass User { public function name(){ echo $this->name; } }",
    medium: '<?php\necho "hi";',
  },
  {
    language: "PowerShell",
    scorer: scorePowerShell,
    strong: 'Install-Module Pester\n$env:NODE_ENV = "test"\nGet-ChildItem | Where-Object { $_.Name }',
    medium: "winget install Git.Git",
  },
  {
    language: "Python",
    scorer: scorePython,
    strong:
      'import os\nfrom pathlib import Path\ndef main() -> None:\n    print(f"cwd={Path.cwd()}")\nif __name__ == "__main__":\n    main()',
    medium: "import os\nprint(os.getcwd())",
  },
  {
    language: "R",
    scorer: scoreR,
    strong: "library(ggplot2)\ndf <- data.frame(x = c(1,2,3))\nggplot(df) + geom_point()\nsummary(df)",
    medium: "x <- c(1,2,3)\nsummary(x)",
  },
  {
    language: "RegEx",
    scorer: scoreRegex,
    strong: "/^(?:[a-z]+)\\d{2,4}$/i",
    medium: "^[a-z]+$",
  },
  {
    language: "Ruby",
    scorer: scoreRuby,
    strong: 'require "json"\nclass App\n  def call\n    puts "hi"\n  end\nend',
    medium: 'puts "hi"\nend',
  },
  {
    language: "Rust",
    scorer: scoreRust,
    strong:
      'use std::io;\nfn main(){ let mut name = String::from("x"); println!("{}", name); match Some(name) { Some(v) => println!("{}", v), None => () } }',
    medium: 'fn main(){ println!("hi"); }',
  },
  {
    language: "Scala",
    scorer: scoreScala,
    strong:
      "import scala.util.*\nobject App { case class User(id: Int); def main(args: Array[String]) = println(User(1)) }",
    medium: "val x = 1\nx match { case _ => x }",
  },
  {
    language: "SQL",
    scorer: scoreSQL,
    strong:
      "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));\nSELECT name FROM users WHERE id = 1 ORDER BY name;",
    medium: "SELECT name FROM users WHERE id = 1",
  },
  {
    language: "Swift",
    scorer: scoreSwift,
    strong:
      'import SwiftUI\nstruct ContentView: View { var body: some View { Text("Hi") } }\nfunc greet(name: String) -> String { return name }',
    medium: 'import Foundation\nprint("hi")',
  },
  {
    language: "TypeScript",
    scorer: scoreTypeScript,
    strong:
      'interface User { id: number; name: string }\ntype Result = Promise<User>;\nconst user: User = { id: 1, name: "A" };',
    medium: "const id: number = 1;",
  },
  {
    language: "XML",
    scorer: scoreXML,
    strong: '<?xml version="1.0"?><catalog xmlns="urn:test"><book id="1"/></catalog>',
    medium: "<note><to>A</to></note>",
  },
  {
    language: "YAML",
    scorer: scoreYAML,
    strong: "---\napp:\n  name: mdlens\n  features:\n    - markdown",
    medium: "name: app\nversion: 1.0",
  },
];

test("all language scorers have strong, medium, and low-confidence plain-text behavior", () => {
  for (const fixture of scorerCases) {
    const strong = fixture.scorer(fixture.strong);
    const medium = fixture.scorer(fixture.medium);
    const negative = fixture.scorer(fixture.negative ?? PLAIN_PROSE);

    assert.equal(strong.language, fixture.language);
    assert.ok(strong.score >= 70, `${fixture.language} strong score was ${strong.score}: ${strong.reasons.join("; ")}`);
    assert.ok(medium.score >= 35, `${fixture.language} medium score was ${medium.score}: ${medium.reasons.join("; ")}`);
    assert.ok(
      negative.score < 35,
      `${fixture.language} plain-text score was ${negative.score}: ${negative.reasons.join("; ")}`
    );
  }
});

test("required detection collisions resolve to the intended language", () => {
  for (const command of [
    "npm install",
    "pnpm add react",
    "yarn add vite",
    "bun add zod",
    "npx create-next-app@latest",
  ]) {
    assert.equal(topLanguage(command), "Bash", `${command} should detect as Bash`);
  }

  assert.equal(topLanguage("flowchart TD\n  A --> B\n  B --> C"), "Mermaid");
  assert.equal(topLanguage("FROM node:22-alpine\nRUN npm install\nCOPY . ."), "Dockerfile");
  assert.equal(topLanguage('{"name":"mdlens","private":true,"scripts":{"build":"next build"}}'), "JSON");

  const typedSnippet = "interface User { id: number }\nconst user: User = { id: 1 };";
  const detected = detectLanguageWithScoring(typedSnippet).allScores;
  assert.equal(detected[0]?.language, "TypeScript");
  assert.ok(
    (detected.find(result => result.language === "TypeScript")?.score ?? 0) >
      (detected.find(result => result.language === "JavaScript")?.score ?? 0)
  );
});

test("plain prose produces no medium-confidence suggestions", () => {
  const mediumOrBetter = detectLanguageWithScoring(PLAIN_PROSE).allScores.filter(result => result.score >= 35);
  assert.deepEqual(mediumOrBetter, []);
});

function topLanguage(text: string): string | undefined {
  return detectLanguageWithScoring(text).topLanguage?.language;
}
