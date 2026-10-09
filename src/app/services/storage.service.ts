import { Injectable } from '@angular/core';

export interface PedidoPersistido {
  id?: number;
  tipo: 'pedido' | 'mensaje';
  producto?: string;
  categoria?: string;
  cantidad?: number;
  total?: number;
  mensaje?: string;
  fecha: string;
  estado: 'pendiente' | 'enviado';
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly dbName = 'backusVentasDB';
  private readonly storeName = 'pedidos';

  async abrirDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la base de datos'));
    });
  }

  async guardarPedido(pedido: PedidoPersistido): Promise<void> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      store.add(pedido);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar el pedido'));
    });
  }

  async listarPedidosPendientes(): Promise<PedidoPersistido[]> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as PedidoPersistido[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error('No se pudieron recuperar los pedidos'));
    });
  }
}
