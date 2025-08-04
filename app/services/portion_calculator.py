# app/services/portion_calculator.py - FIXED VERSION
import re

class PortionCalculator:
    def __init__(self):
        # Define food categories with realistic calorie densities
        self.food_categories = {
            'rice_dishes': {
                'keywords': ['rice', 'biryani', 'pulao', 'bhat', 'bisi bele', 'puliyodarai', 'curd rice', 'khichdi'],
                'calories_per_100g': 130,
                'unit': 'grams'
            },
            'roti_bread': {
                'keywords': ['roti', 'parantha', 'kulcha', 'naan', 'luchi', 'makki roti', 'tandoori roti'],
                'calories_per_piece': 80,
                'unit': 'pieces',
                'piece_name': 'roti'
            },
            'dosa_crepes': {
                'keywords': ['dosa', 'uttapam', 'masala dosa', 'coconut chutney dosa', 'pesarattu'],
                'calories_per_piece': 150,
                'unit': 'pieces',
                'piece_name': 'dosa'
            },
            'idli_steamed': {
                'keywords': ['idli', 'dhokla', 'khaman dhokla', 'handvo', 'khandvi'],
                'calories_per_piece': 40,
                'unit': 'pieces',
                'piece_name': 'piece'
            },
            'vada_fried': {
                'keywords': ['vada', 'medu vada', 'samosa', 'pakora', 'bread pakora', 'beguni'],
                'calories_per_piece': 80,
                'unit': 'pieces',
                'piece_name': 'piece'
            },
            'upma_poha': {
                'keywords': ['upma', 'poha', 'batata poha', 'rava upma', 'sabudana khichdi'],
                'calories_per_100g': 110,
                'unit': 'grams'
            },
            'dal_curry': {
                'keywords': ['dal', 'sambar', 'rasam', 'curry', 'chana masala', 'rajma', 'chole', 'kadhi'],
                'calories_per_100g': 100,
                'unit': 'grams'
            },
            'paratha_stuffed': {
                'keywords': ['parantha', 'aloo parantha', 'rajma parantha', 'puran poli', 'thepla'],
                'calories_per_piece': 120,
                'unit': 'pieces',
                'piece_name': 'parantha'
            },
            'street_food': {
                'keywords': ['pav bhaji', 'vada pav', 'bhel puri', 'sev puri', 'gol gappa', 'chaat', 'dabeli', 'misal pav'],
                'calories_per_serving': 200,
                'unit': 'servings'
            },
            'snacks_light': {
                'keywords': ['mixture', 'murukku', 'khakhra', 'roasted chana', 'roasted peanuts', 'jhalmuri'],
                'calories_per_100g': 400,
                'unit': 'grams'
            },
            'fruits_nuts': {
                'keywords': ['banana', 'almonds', 'dates', 'mixed nuts', 'fruit chaat', 'yogurt with fruits'],
                'calories_per_serving': 80,
                'unit': 'servings'
            },
            'drinks_light': {
                'keywords': ['green tea', 'masala chai', 'cornflakes with milk', 'oats porridge'],
                'calories_per_serving': 100,
                'unit': 'cups'
            },
            'heavy_dishes': {
                'keywords': ['thali', 'baati churma', 'chole bhature', 'butter chicken', 'paneer makhani'],
                'calories_per_serving': 400,
                'unit': 'servings'
            }
        }
    
    def identify_food_category(self, meal_name: str) -> str:
        """Identify the food category based on meal name"""
        meal_name_lower = meal_name.lower()
        
        for category, info in self.food_categories.items():
            for keyword in info['keywords']:
                if keyword in meal_name_lower:
                    return category
        
        # Default fallback
        return 'rice_dishes'
    
    def calculate_portion(self, meal_name: str, target_calories: int) -> str:
        """Calculate appropriate portion size based on meal type and target calories"""
        category = self.identify_food_category(meal_name)
        category_info = self.food_categories[category]
        meal_name_lower = meal_name.lower()
        
        if category_info['unit'] == 'grams':
            # Calculate grams needed
            calories_per_100g = category_info['calories_per_100g']
            grams_needed = (target_calories / calories_per_100g) * 100
            
            # Round to practical portions
            if grams_needed < 50:
                portion = 50
            elif grams_needed < 100:
                portion = round(grams_needed / 25) * 25
            else:
                portion = round(grams_needed / 50) * 50
            
            return f"{portion}g"
            
        elif category_info['unit'] == 'pieces':
            # Calculate number of pieces needed
            calories_per_piece = category_info.get('calories_per_piece', 100)
            pieces_needed = target_calories / calories_per_piece
            
            # Round to practical whole numbers
            if pieces_needed < 0.5:
                pieces = 1
            elif pieces_needed < 1.5:
                pieces = 1
            elif pieces_needed < 2.5:
                pieces = 2
            elif pieces_needed < 3.5:
                pieces = 3
            else:
                pieces = max(1, round(pieces_needed))
            
            # Get appropriate piece name - FIXED BUG HERE
            piece_word = self._get_piece_word(category, meal_name_lower, category_info)
            return f"{pieces} {piece_word}" if pieces > 1 else f"1 {piece_word}"
            
        elif category_info['unit'] == 'servings':
            # Calculate servings
            calories_per_serving = category_info.get('calories_per_serving', 200)
            servings_needed = target_calories / calories_per_serving
            
            if servings_needed < 0.75:
                return "1 small serving"
            elif servings_needed < 1.25:
                return "1 serving"
            elif servings_needed < 1.75:
                return "1.5 servings"
            else:
                servings = max(1, round(servings_needed))
                return f"{servings} servings"
                
        elif category_info['unit'] == 'cups':
            # Calculate cups
            calories_per_serving = category_info.get('calories_per_serving', 100)
            cups_needed = target_calories / calories_per_serving
            
            if cups_needed < 0.75:
                return "1 small cup"
            elif cups_needed < 1.25:
                return "1 cup"
            else:
                cups = max(1, round(cups_needed))
                return f"{cups} cups"
        
        return f"{target_calories} cal serving"  # Fallback
    
    def _get_piece_word(self, category: str, meal_name: str, category_info: dict) -> str:
        """Get appropriate word for pieces based on food type - FIXED VERSION"""
        
        if 'roti' in meal_name and 'tandoori roti' not in meal_name:
            return 'roti'
        elif 'tandoori roti' in meal_name:
            return 'tandoori roti'
        elif 'parantha' in meal_name or 'paratha' in meal_name:
            return 'parantha'
        elif 'kulcha' in meal_name:
            return 'kulcha'  
        elif 'naan' in meal_name:
            return 'naan'
        elif 'luchi' in meal_name:
            return 'luchi'
        elif 'dosa' in meal_name:
            return 'dosa'
        elif 'uttapam' in meal_name:
            return 'uttapam'
        elif 'idli' in meal_name:
            return 'idli'
        elif 'vada' in meal_name:
            return 'vada'
        elif 'samosa' in meal_name:
            return 'samosa'
        elif 'dhokla' in meal_name:
            return 'piece'
        elif 'pakora' in meal_name:
            return 'piece'
        elif 'bhature' in meal_name:
            return 'bhature'
        else:
            # Use the category_info that was passed as parameter
            return category_info.get('piece_name', 'piece')

# Test function
if __name__ == "__main__":
    calculator = PortionCalculator()
    
    test_meals = [
        ("Sambar Rice", 300),
        ("Masala Dosa", 400), 
        ("Idli Sambar", 200),
        ("Roti with Dal", 250),
        ("Aloo Parantha", 350),
        ("Vada Pav", 300),
        ("Dhokla", 150),
        ("Biryani", 500),
        ("Poha", 200),
        ("Green Tea with Cookies", 100)
    ]
    
    print("CalorieMate Portion Calculator Test:")
    print("-" * 50)
    for meal_name, calories in test_meals:
        portion = calculator.calculate_portion(meal_name, calories)
        category = calculator.identify_food_category(meal_name)
        print(f"{meal_name:<25} ({calories} cal): {portion:<15} [{category}]")