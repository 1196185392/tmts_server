-- Official-source candidates are kept only in the internal provenance store.
-- Their content is not published until a reviewer extracts region/cultivar-specific
-- guidance and confirms that reuse is permitted.
INSERT OR IGNORE INTO plant_sources
  (id,species_id,scope,authority,title,source_url,external_id,license_note,status,retrieved_at)
VALUES
  ('src-cultivation-chive-wuhu-20261107','chive','cultivation','芜湖市农业农村局','韭菜栽培技术要点','https://nync.wuhu.gov.cn/ztzl/xdzy/8220975.html','wuhu-8220975','Official-page candidate. Do not publish or reproduce content until human review confirms scope, region, and reuse terms.','review','2026-11-07T09:15:00Z'),
  ('src-cultivation-spinach-shanghai-20261107','spinach','cultivation','上海市农业农村委员会','菠菜种植有哪些技术要点？','https://nyncw.sh.gov.cn/bwbdzzl/20241015/b9fa8cb205cc4d92972333e975c15904.html','shanghai-b9fa8cb205cc4d92972333e975c15904','Official-page candidate. Do not publish or reproduce content until human review confirms scope, region, and reuse terms.','review','2026-11-07T09:15:00Z'),
  ('src-cultivation-strawberry-liaoning-20261107','strawberry','cultivation','辽宁省农业农村厅','设施草莓生产技术规程','https://nync.ln.gov.cn/nync/attachDir/2025/04/2025041710552363400.pdf','liaoning-2025041710552363400','Official technical-standard candidate. Do not publish or reproduce content until human review confirms scope, region, and reuse terms.','review','2026-11-07T09:15:00Z');
