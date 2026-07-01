import { MenuRepository } from '../repositories/MenuRepository.js';
import { MenuItem } from '../types/index.js';

export class MenuService {
  constructor(private readonly menuRepository: MenuRepository) {}

  async getPublicMenu(): Promise<MenuItem[]> {
    return this.menuRepository.findAllPublic();
  }

  async getAdminMenu(): Promise<MenuItem[]> {
    return this.menuRepository.findAllAdmin();
  }

  async addMenuItem(data: { name: string; price: number; category: string; image?: string }): Promise<MenuItem> {
    const id = 'item_' + Math.random().toString(36).substring(2, 11);
    const defaultImage = data.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=150&auto=format&fit=crop&q=60';
    
    await this.menuRepository.create({
      id,
      name: data.name,
      price: data.price,
      category: data.category,
      image: defaultImage
    });

    const newItem = await this.menuRepository.findById(id);
    if (!newItem) {
      throw new Error('Failed to retrieve newly created menu item');
    }
    return newItem;
  }

  async editMenuItem(id: string, data: { name: string; price: number; category: string; is_available: boolean; image?: string }): Promise<MenuItem> {
    const existing = await this.menuRepository.findById(id);
    if (!existing) {
      const err = new Error('Menu item not found');
      (err as any).statusCode = 404;
      throw err;
    }

    await this.menuRepository.update(id, {
      name: data.name,
      price: data.price,
      category: data.category,
      is_available: data.is_available ? 1 : 0,
      image: data.image || existing.image || ''
    });

    const updated = await this.menuRepository.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated menu item');
    }
    return updated;
  }

  async deleteMenuItem(id: string): Promise<void> {
    const existing = await this.menuRepository.findById(id);
    if (!existing) {
      const err = new Error('Menu item not found');
      (err as any).statusCode = 404;
      throw err;
    }
    await this.menuRepository.delete(id);
  }
}
