import * as extensionApi from '@podman-desktop/api';

export class KubernetesProviderFactory implements extensionApi.Disposable {
  private disposable: extensionApi.Disposable | undefined;

  constructor(
    private provider: extensionApi.Provider,
    private factory: extensionApi.KubernetesProviderConnectionFactory,
    private auditor?: extensionApi.Auditor,
  ) {}

  public refresh(): void {
    const containerConnections = extensionApi.provider.getContainerConnections();
    const runningConnections = containerConnections.filter(conn => conn.connection.status() === 'started');

    if (runningConnections.length > 0) {
      this.disposable ??= this.provider.setKubernetesProviderConnectionFactory(this.factory, this.auditor);
    } else {
      this.dispose();
    }
  }

  public dispose(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = undefined;
    }
  }
}
