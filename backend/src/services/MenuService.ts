import { MenuRepository } from '../repositories/MenuRepository.js';
import { MenuItem } from '../types/index.js';
import { broadcastMenuUpdate } from '../utils/websocket.js';
import { getRedis } from '../config/redis.js';

export class MenuService {
  constructor(private readonly menuRepository: MenuRepository) {}

  async getPublicMenu(canteenId?: string): Promise<MenuItem[]> {
    const cacheKey = `canteen:menu:public:${canteenId || 'all'}`;
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`Serving public menu for canteen ${canteenId || 'all'} from Redis cache.`);
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('Failed to read public menu from Redis cache:', err);
    }

    const menu = await this.menuRepository.findAllPublic(canteenId);

    try {
      const redis = getRedis();
      await redis.set(cacheKey, JSON.stringify(menu));
      console.log(`Cached public menu for canteen ${canteenId || 'all'} in Redis.`);
    } catch (err) {
      console.error('Failed to write public menu to Redis cache:', err);
    }

    return menu;
  }

  async getAdminMenu(canteenId?: string): Promise<MenuItem[]> {
    const cacheKey = `canteen:menu:admin:${canteenId || 'all'}`;
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`Serving admin menu for canteen ${canteenId || 'all'} from Redis cache.`);
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('Failed to read admin menu from Redis cache:', err);
    }

    const menu = await this.menuRepository.findAllAdmin(canteenId);

    try {
      const redis = getRedis();
      await redis.set(cacheKey, JSON.stringify(menu));
      console.log(`Cached admin menu for canteen ${canteenId || 'all'} in Redis.`);
    } catch (err) {
      console.error('Failed to write admin menu to Redis cache:', err);
    }

    return menu;
  }

  async addMenuItem(data: { name: string; price: number; category: string; image?: string; canteen_id: string }): Promise<MenuItem> {
    const id = 'item_' + Math.random().toString(36).substring(2, 11);
    const defaultImage = data.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=150&auto=format&fit=crop&q=60';
    
    await this.menuRepository.create({
      id,
      name: data.name,
      price: data.price,
      category: data.category,
      image: defaultImage,
      canteen_id: data.canteen_id
    });

    const newItem = await this.menuRepository.findById(id);
    if (!newItem) {
      throw new Error('Failed to retrieve newly created menu item');
    }

    // Invalidate Redis caches
    await this.invalidateCache(data.canteen_id);

    // Trigger real-time update
    broadcastMenuUpdate();

    return newItem;
  }

  async editMenuItem(id: string, data: { name: string; price: number; category: string; is_available: boolean; image?: string; canteen_id?: string }, restrictCanteenId?: string): Promise<MenuItem> {
    const existing = await this.menuRepository.findById(id);
    if (!existing) {
      const err = new Error('Menu item not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (restrictCanteenId && existing.canteen_id !== restrictCanteenId) {
      const err = new Error('Unauthorized to edit items for this canteen');
      (err as any).statusCode = 403;
      throw err;
    }

    const itemCanteenId = data.canteen_id || existing.canteen_id;

    await this.menuRepository.update(id, {
      name: data.name,
      price: data.price,
      category: data.category,
      is_available: data.is_available ? 1 : 0,
      image: data.image || existing.image || '',
      canteen_id: itemCanteenId
    });

    const updated = await this.menuRepository.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated menu item');
    }

    // Invalidate Redis caches
    await this.invalidateCache(itemCanteenId);

    // Trigger real-time update
    broadcastMenuUpdate();

    return updated;
  }

  async deleteMenuItem(id: string, restrictCanteenId?: string): Promise<void> {
    const existing = await this.menuRepository.findById(id);
    if (!existing) {
      const err = new Error('Menu item not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (restrictCanteenId && existing.canteen_id !== restrictCanteenId) {
      const err = new Error('Unauthorized to delete items for this canteen');
      (err as any).statusCode = 403;
      throw err;
    }

    await this.menuRepository.delete(id);

    // Invalidate Redis caches
    await this.invalidateCache(existing.canteen_id);

    // Trigger real-time update
    broadcastMenuUpdate();
  }

  private async invalidateCache(canteenId?: string): Promise<void> {
    try {
      const redis = getRedis();
      if (canteenId) {
        await redis.del(
          `canteen:menu:public:${canteenId}`,
          `canteen:menu:public:all`,
          `canteen:menu:admin:${canteenId}`,
          `canteen:menu:admin:all`
        );
      } else {
        await redis.del(
          `canteen:menu:public:all`,
          `canteen:menu:admin:all`
        );
      }
      console.log(`Successfully invalidated Redis menu caches for canteen: ${canteenId || 'all'}.`);
    } catch (err) {
      console.error('Failed to invalidate Redis caches:', err);
    }
  }
}
