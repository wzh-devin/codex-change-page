import { useApp } from "../AppContext";

export function OperationBanner() {
  const { snapshot, busy, progress, error, clearError } = useApp();
  if (error) {
    return (
      <div className="operation-banner error" role="alert">
        <span><strong>操作未完成</strong>{error}</span>
        <button onClick={clearError} aria-label="关闭错误">×</button>
      </div>
    );
  }
  if (!busy && snapshot?.interruptedOperation) {
    return (
      <div className="operation-banner warning" role="status">
        <span>
          <strong>检测到中断操作</strong>
          上次 {snapshot.interruptedOperation.command} 未正常结束，请检查诊断后重试。
        </span>
      </div>
    );
  }
  if (!busy && !progress) return null;
  return (
    <div className="operation-banner" aria-live="polite">
      <span>
        <strong>{busy ? "正在处理" : "最近操作"}</strong>
        {progress?.message ?? "请稍候…"}
      </span>
      {busy && <div className="progress-line"><i /></div>}
    </div>
  );
}
