import { relations } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

// Menu slots: 'header', 'footer-company', 'footer-services', 'footer-social'.
export const menus = pgTable('menus', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
});

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    label: text('label').notNull(),
    url: text('url').notNull(),
    isExternal: boolean('is_external').default(false).notNull(),
    openInNewTab: boolean('open_in_new_tab').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
  },
  (t) => ({
    menuOrderIdx: index('menu_items_menu_order_idx').on(t.menuId, t.sortOrder),
  }),
);

export const menusRelations = relations(menus, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  menu: one(menus, { fields: [menuItems.menuId], references: [menus.id] }),
  parent: one(menuItems, {
    fields: [menuItems.parentId],
    references: [menuItems.id],
    relationName: 'menu_item_parent',
  }),
  children: many(menuItems, { relationName: 'menu_item_parent' }),
}));
