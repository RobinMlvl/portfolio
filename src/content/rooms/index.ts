import type { Room } from '@/content/schema';
import { dewex } from './dewex';
import { dewexOs } from './dewex-os';
import { swissLocalAdventures } from './swiss-local-adventures';
import { riview } from './riview';

/** Dewex, Dewex OS, Swiss Local Adventures, riview.me (2026-10-06: riview.me back among the products, Drinxlab listed in the side projects). */
export const rooms: Room[] = [dewex, dewexOs, swissLocalAdventures, riview];
