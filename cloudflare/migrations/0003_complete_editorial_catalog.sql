-- Bring the published D1 catalog into line with the twelve illustrated plants
-- in the mini program. This is our own editorial starter content, not a feed
-- from a third-party plant database.
UPDATE plant_species SET name='生菜',aliases_json='["叶用莴苣"]',summary='一片片舒展的嫩叶，让阳台也有了小菜园的模样。从播种开始，观察每天的一点变化。',light='半日照',temperature='15–20°C',container='深度 15 cm 以上',updated_at=CURRENT_TIMESTAMP WHERE id='lettuce' AND source='editorial';
UPDATE plant_species SET name='小番茄',aliases_json='["樱桃番茄"]',summary='有阳光的地方，也可以长出一串串小番茄。记下它开花、结果和慢慢变红的每一步。',light='全日照',temperature='20–28°C',container='容积 15 L 以上',updated_at=CURRENT_TIMESTAMP WHERE id='tomato' AND source='editorial';
UPDATE plant_species SET name='薄荷',aliases_json='["银丹草"]',summary='给窗边添一抹清凉的绿。叶片舒展时，连日常浇水也变得有了香气。',light='半日照',temperature='15–25°C',container='独立花盆',updated_at=CURRENT_TIMESTAMP WHERE id='mint' AND source='editorial';
UPDATE plant_species SET name='长寿花',scientific_name='Kalanchoe blossfeldiana',aliases_json='["圣诞伽蓝菜"]',summary='在安静的绿叶之间，等一簇小花慢慢绽放。用一盆花，留住季节的颜色。',light='半日照',temperature='15–25°C',container='口径 12–18 cm',updated_at=CURRENT_TIMESTAMP WHERE id='flower' AND source='editorial';

INSERT OR IGNORE INTO plant_species (id,name,category,aliases_json,summary,light,temperature,container,status,source) VALUES
('chive','韭菜','蔬菜','["韭","起阳草"]','割一茬，长一茬。给厨房留一小盆常青的味道，也给日子添一点种植的乐趣。','全日照','15–25°C','口径 20–25 cm','published','editorial'),
('garlic','大蒜','蔬菜','["蒜","胡蒜"]','从一瓣蒜开始，等一丛绿意。栽种过程直观，很适合作为你的第一份种植记录。','全日照','12–22°C','深度 20 cm 以上','published','editorial'),
('bokchoy','小白菜','蔬菜','["青菜"]','清爽的绿叶，适合小空间种植。分批播种，把收获的期待排进日历。','全日照','15–22°C','深度 15 cm 以上','published','editorial'),
('strawberry','草莓','水果','["洋莓"]','从一朵小白花到一颗红果子，把季节里甜甜的期待，种在触手可及的地方。','全日照','15–25°C','口径 20 cm 以上','published','editorial'),
('rosemary','迷迭香','香草','["海洋之露"]','指尖轻轻掠过，留下一点清新的香气。它是花园里的常绿风景，也是厨房的小帮手。','全日照','15–25°C','口径 20 cm 以上','published','editorial'),
('spinach','菠菜','蔬菜','["波斯菜"]','凉爽时节里的一抹深绿。把播种与采收的时间记下来，下一季就有了自己的经验。','全日照','10–20°C','深度 20 cm 以上','published','editorial'),
('carrot','胡萝卜','蔬菜','["红萝卜"]','土壤之下藏着慢慢长大的惊喜。选一个深一点的容器，耐心等待收获的那一天。','全日照','15–23°C','深度 30 cm 以上','published','editorial'),
('blueberry','蓝莓','水果','["越橘"]','一盆小果树，一份长久的陪伴。记录新芽、花朵和果实的变化，跟着季节一起生长。','全日照','15–25°C','容积 20 L 以上','published','editorial');
