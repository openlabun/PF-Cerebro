import logoCerebroDark from '../assets/logo-cerebro.png'
import logoCerebroLight from '../assets/logo-cerebro-light.png'

function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <span className="footer-brand">
          <img className="footer-logo footer-logo-light" src={logoCerebroLight} alt="" />
          <img className="footer-logo footer-logo-dark" src={logoCerebroDark} alt="" />
          <span>Cerebro</span>
        </span>
        <span className="footer-sep">·</span>
        <span>Universidad del Norte</span>
        <span className="footer-sep">·</span>
        <a href="https://github.com/openlabun/Cerebro" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </footer>
  )
}

export default Footer
