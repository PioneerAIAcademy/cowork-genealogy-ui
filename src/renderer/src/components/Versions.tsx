function Versions(): React.JSX.Element {
  return (
    <ul className="versions">
      <li className="electron-version">Electron v{process.versions.electron}</li>
      <li className="chrome-version">Chromium v{process.versions.chrome}</li>
      <li className="node-version">Node v{process.versions.node}</li>
    </ul>
  )
}

export default Versions
