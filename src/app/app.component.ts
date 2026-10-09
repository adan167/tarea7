import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CatalogoService, Producto } from './services/catalogo.service';
import { PedidoPersistido, StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  catalogo: Producto[] = [];
  online = navigator.onLine;
  mensaje = '';
  estadoMensaje = '';
  pedidosPendientes: PedidoPersistido[] = [];
  pedidoSeleccionado: PedidoPersistido | null = null;
  cantidades: Record<number, number> = {};

  private readonly handleOnline = () => {
    this.online = navigator.onLine;
    if (this.online) {
      this.estadoMensaje = 'Conectado';
    }
  };

  private readonly handleOffline = () => {
    this.online = false;
    this.estadoMensaje = 'Sin conexión';
  };

  constructor(
    private readonly catalogoService: CatalogoService,
    private readonly storageService: StorageService
  ) {}

  async ngOnInit(): Promise<void> {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    await this.cargarCatalogo();
    await this.cargarPedidosPendientes();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private async cargarCatalogo(): Promise<void> {
    this.catalogo = await firstValueFrom(this.catalogoService.obtenerCatalogo());
  }

  private async cargarPedidosPendientes(): Promise<void> {
    this.pedidosPendientes = await this.storageService.listarPedidosPendientes();
  }

  obtenerCantidad(productoId: number): number {
    return this.cantidades[productoId] ?? 1;
  }

  actualizarCantidad(productoId: number, delta: number): void {
    const actual = this.obtenerCantidad(productoId);
    this.cantidades[productoId] = Math.max(1, actual + delta);
  }

  async registrarPedido(producto: Producto): Promise<void> {
    const cantidad = this.obtenerCantidad(producto.id);
    const pedido: PedidoPersistido = {
      tipo: 'pedido',
      producto: producto.producto,
      categoria: producto.categoria,
      cantidad,
      total: Number((producto.precio * cantidad).toFixed(2)),
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    };

    await this.storageService.guardarPedido(pedido);
    this.estadoMensaje = this.online
      ? `Pedido de ${producto.producto} registrado y listo para sincronizar.`
      : `Pedido guardado localmente en IndexedDB.`;

    await this.cargarPedidosPendientes();
  }

  verDetallePedido(pedido: PedidoPersistido): void {
    this.pedidoSeleccionado = pedido;
  }

  cerrarDetallePedido(): void {
    this.pedidoSeleccionado = null;
  }

  async guardarMensaje(): Promise<void> {
    const mensaje = this.mensaje.trim();

    if (!mensaje) {
      this.estadoMensaje = 'Escribe un mensaje antes de guardar.';
      return;
    }

    if (this.online) {
      this.estadoMensaje = 'Mensaje procesado correctamente.';
      this.mensaje = '';
      return;
    }

    const persistido: PedidoPersistido = {
      tipo: 'mensaje',
      mensaje,
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    };

    await this.storageService.guardarPedido(persistido);
    this.estadoMensaje = 'Mensaje guardado localmente y pendiente de sincronización.';
    this.mensaje = '';
    await this.cargarPedidosPendientes();
    this.pedidoSeleccionado = persistido;
  }
}
