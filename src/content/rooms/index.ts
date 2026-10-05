import type { Room } from '@/content/schema';
import { dewex } from './dewex';
import { dewexOs } from './dewex-os';
import { swissLocalAdventures } from './swiss-local-adventures';
import { drinxlab } from './drinxlab';

/** Ordered as decided on 2026-09-17: Dewex, Dewex OS, Swiss Local Adventures, Drinxlab. riview.me is listed in the Also section (2026-09-18). */
export const rooms: Room[] = [dewex, dewexOs, swissLocalAdventures, drinxlab];
