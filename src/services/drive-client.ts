export type DriveFile = { id: string; name: string; createdTime?: string; size?: string };
export function createDriveClient(request: (url: string, init?: RequestInit) => Promise<Response>) {
  const root = 'https://www.googleapis.com/drive/v3/files';
  return {
    async list(): Promise<DriveFile[]> {
      const all: DriveFile[] = []; let next: string | undefined;
      do {
        const params = new URLSearchParams({ spaces: 'appDataFolder', q: "trashed = false and appProperties has { key='kind' and value='saldo-en-mano-backup' }", fields: 'nextPageToken,files(id,name,createdTime,size)', orderBy: 'createdTime desc', pageSize: '100', ...(next ? { pageToken: next } : {}) });
        const response = await request(root + '?' + params); if (!response.ok) throw new Error('No se pudo consultar el respaldo de Drive.');
        const data = await response.json();
        if (!Array.isArray(data.files)) throw new Error('Respuesta de Drive inválida.');
        for (const f of data.files) if (typeof f.id === 'string' && typeof f.name === 'string') all.push(f);
        next = typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
        if (all.length > 10000) throw new Error('Hay demasiados respaldos para esta consulta.');
      } while (next);
      return all;
    },
    async upload(name: string, document: string): Promise<string> {
      const existing = (await this.list()).find(f => f.name === name);
      if (existing) return existing.id;
      const boundary = 'saldo_en_mano_backup_boundary';
      const metadata = { name, parents: ['appDataFolder'], appProperties: { kind: 'saldo-en-mano-backup' } };
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${document}\r\n--${boundary}--`;
      const response = await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
      if (!response.ok) throw new Error('Drive no confirmó la copia. Se conserva el respaldo local para reintentar.');
      const data = await response.json(); if (typeof data.id !== 'string') throw new Error('Drive no confirmó el identificador del respaldo.');
      return data.id;
    },
    async download(id: string): Promise<string> {
      const response = await request(root + '/' + encodeURIComponent(id) + '?alt=media');
      if (!response.ok) throw new Error('No se pudo descargar el respaldo de Drive.');
      const size = Number(response.headers.get('content-length') ?? 0);
      if (size > 50000000) throw new Error('El respaldo excede el tamaño permitido.');
      const document = await response.text(); if (document.length > 50000000) throw new Error('El respaldo excede el tamaño permitido.');
      return document;
    },
    async remove(id: string): Promise<void> {
      const response = await request(root + '/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error('No se pudo retirar un respaldo antiguo.');
    },
  };
}
