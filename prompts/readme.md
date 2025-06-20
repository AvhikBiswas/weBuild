# 🧠 WeBuild Artifact Parser

This project demonstrates how WeBuild  can parse special XML-like `<weBuild>` tags to **create a full Next.js 15+ app structure automatically**.

## 📦 What Is It?

The format allows you to declare:

```xml
<weBuild action="create" fileName="app/page.tsx">
export default function Home() {
  return <h1>Hello, WeBuild!</h1>;
}
</weBuild>
