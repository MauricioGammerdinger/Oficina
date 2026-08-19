CREATE UNIQUE INDEX "item_unico_por_contagem" ON "count_items" USING btree ("count_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receita_unica" ON "service_type_items" USING btree ("service_type_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_moves_product_idx" ON "stock_moves" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_moves_vehicle_idx" ON "stock_moves" USING btree ("vehicle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "servico_unico_por_carro" ON "vehicle_services" USING btree ("vehicle_id","service_type_id");