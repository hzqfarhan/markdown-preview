export const DEFAULT_MARKDOWN = `# Haziq Farhan (@hzqfarhan)

[![Haziq Farhan Avatar](https://avatars.githubusercontent.com/u/203814306?v=4)](https://github.com/hzqfarhan) [![Banner](https://lh3.googleusercontent.com/d/1YBXsnq8qpe_5ctOZcGgtGFjIhg7vUDi3)](https://seladevs.verce.my/)

> Software Engineering student at **UTHM (1BIK)** | Full-Stack Developer & UI/UX Designer based in Malaysia.

[![GitHub](https://img.shields.io/badge/GitHub-hzqfarhan-181717?style=for-the-badge&logo=github)](https://github.com/hzqfarhan)
[![Portfolio](https://img.shields.io/badge/Website-haziqfarhan.my-E91E8C?style=for-the-badge&logo=googlechrome&logoColor=white)](https://haziqfarhan.my)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-hzqfarhan-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/hzqfarhan)
[![Instagram](https://img.shields.io/badge/Instagram-@icydho-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/icydho)
[![Discord](https://img.shields.io/badge/Discord-Community-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/692221016637702146)

---

## 🌌 Overview

I'm **Haziq Farhan**, a **Software Engineering** student at **Universiti Tun Hussein Onn Malaysia (UTHM)** with a strong passion for **full-stack web development**, **UI/UX design**, and building impactful digital products.

I love crafting modern web experiences that blend clean aesthetics, practical functionality, and delightful user interactions.

- 🔭 **Currently Building:** **ConsensusAI** — multi-LLM consensus aggregator & sentiment analyzer
- 🎨 **Interests:** UI/UX Design, Product Development, 3D Design & Creative Web Systems
- 🎮 **Background:** Graphic Designer at *VisualX Studio (VX)* for over 2 years
- 📍 **Location:** Malaysia

---

## 🛠️ Tech Stack & Tools

| Category | Technologies |
| :--- | :--- |
| **Frontend** | React, Next.js, TypeScript, Tailwind CSS, Vanilla CSS |
| **Backend & Cloud** | Node.js, Supabase, Laravel, PHP, Python |
| **Mobile & Systems** | Flutter, C++, Java |
| **Design** | Figma, Adobe Creative Suite, 3D Modeling |

---

## 💻 Sample Code (ConsensusAI Engine)

\`\`\`typescript
interface ModelResponse {
  provider: 'Gemini' | 'OpenAI' | 'Anthropic';
  content: string;
  confidenceScore: number;
}

export async function aggregateConsensus(prompt: string): Promise<string> {
  const models = ['gemini-3.5-flash-lite', 'gpt-4o-mini', 'claude-3-5-sonnet'];
  console.log(\`Running multi-model consensus for prompt: "\${prompt}"...\`);

  // Evaluates agreement and merges responses into structured output
  return \`Consensus reached across \${models.length} AI providers!\`;
}
\`\`\`

---

## 🎯 Current Roadmap & Goals

- [x] Full-Stack PWA with offline Dexie DB storage
- [x] Multi-key fallback with automatic rate-limit failover
- [x] Multi-color syntax highlighting with custom line numbers
- [x] Google Docs 1-click cloud synchronization
- [ ] Launch ConsensusAI multi-LLM scoring platform

---

## ☕ Support & Connect

[![SociaBuzz](https://img.shields.io/badge/Support_on_SociaBuzz-FF6A00?style=for-the-badge&logo=ko-fi&logoColor=white)](https://sociabuzz.com/hakhyun)
`;
