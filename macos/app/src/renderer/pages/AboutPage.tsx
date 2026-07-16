export function AboutPage() {
  return (
    <div className="page">
      <header className="page-header"><div><h1>关于</h1><p>Codex 换肤助手 1.2.0</p></div></header>
      <section className="about-hero">
        <span className="about-mark">◉</span>
        <div>
          <h2>给 Codex 换一张会呼吸的脸。</h2>
          <p>通过本机回环 CDP 注入主题，不修改官方 `.app`、`app.asar` 或代码签名。</p>
        </div>
      </section>
      <section className="section-block">
        <h2>安全与声明</h2>
        <ul className="plain-list">
          <li>非 OpenAI 官方产品。</li>
          <li>不会改写 API Key、Base URL、模型或认证信息。</li>
          <li>第三方人物或 IP 图片的授权责任由主题使用者承担。</li>
          <li>开源许可：MIT。</li>
        </ul>
      </section>
      <section className="sponsor-block">
        <span>感谢 Passion8 赞助本项目</span>
        <button className="link-button" onClick={() => void window.skinAPI.system.openSponsor()}>访问 passion8.cc</button>
      </section>
    </div>
  );
}
