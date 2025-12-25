"""
Обработка бинарных деревьев вопросов
"""
import json
import os
from typing import Dict, Any, Optional


class BinaryTreesManager:
    """Менеджер бинарных деревьев вопросов"""
    
    def __init__(self, trees_path: str = "scenarios/binary_trees.json"):
        self.trees_path = trees_path
        self.trees = {}
        self.load_trees()
    
    def load_trees(self):
        """Загружает деревья вопросов"""
        if os.path.exists(self.trees_path):
            with open(self.trees_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.trees = data.get('trees', {})
    
    def get_tree(self, tree_id: str) -> Optional[Dict[str, Any]]:
        """Получает дерево по ID"""
        return self.trees.get(tree_id)
    
    def get_root_question(self, tree_id: str) -> Optional[Dict[str, Any]]:
        """Получает корневой вопрос дерева"""
        tree = self.get_tree(tree_id)
        if tree:
            return tree.get('root')
        return None
    
    def traverse(self, tree_id: str, node_id: str, answer: Any) -> Optional[Dict[str, Any]]:
        """Обходит дерево на основе ответа"""
        tree = self.get_tree(tree_id)
        if not tree:
            return None
        
        # Получаем текущий узел
        if node_id == 'root':
            current_node = self._with_node_id(tree.get('root'), 'root')
        else:
            nodes = tree.get('nodes', {})
            current_node = self._with_node_id(nodes.get(node_id), node_id)
        
        if not current_node:
            return None
        
        node_type = current_node.get('type')
        
        # Определяем следующий узел на основе ответа
        if node_type == 'choice':
            options = current_node.get('options', [])
            for option in options:
                if option['text'] == answer or option.get('id') == answer:
                    next_node_id = option.get('next')
                    if next_node_id:
                        return self.get_node(tree_id, next_node_id)
                    else:
                        # Конец дерева
                        return {'type': 'end', 'final': True}
        
        elif node_type == 'scale':
            # Для шкал проверяем диапазоны
            branches = current_node.get('branches', {})
            answer_value = int(answer)
            
            for range_key, next_node_id in branches.items():
                if '-' in range_key:
                    min_val, max_val = map(int, range_key.split('-'))
                    if min_val <= answer_value <= max_val:
                        return self.get_node(tree_id, next_node_id)
            
            # Если не попали ни в один диапазон
            next_node_id = current_node.get('next')
            if next_node_id:
                return self.get_node(tree_id, next_node_id)
        
        elif node_type == 'task_trigger':
            # Узел запускает задание
            return {
                'type': 'task_trigger',
                'task_type': current_node.get('task_type'),
                'task_text': current_node.get('task_text'),
                'duration': current_node.get('duration'),
                'guidance': current_node.get('guidance')
            }
        
        elif node_type == 'reflection':
            # Узел для рефлексии
            next_node_id = current_node.get('leads_to')
            if next_node_id == 'task':
                return {'type': 'task_trigger', 'final': True}
            elif next_node_id:
                return self.get_node(tree_id, next_node_id)
        
        elif node_type == 'open_or_choice':
            # Для открытых вопросов с fallback опциями
            # Если ответ - это текст (не из fallback), переходим к следующему узлу
            if isinstance(answer, str) and answer.strip():
                # Проверяем, не является ли ответ одной из fallback опций
                fallback_options = current_node.get('fallback_options', [])
                is_fallback = False
                for option in fallback_options:
                    if option.get('text') == answer or option.get('id') == answer:
                        is_fallback = True
                        next_node_id = option.get('next')
                        if next_node_id:
                            return self.get_node(tree_id, next_node_id)
                        break
                
                # Если это не fallback опция, используем основной next
                if not is_fallback:
                    next_node_id = current_node.get('next')
                    if next_node_id:
                        return self.get_node(tree_id, next_node_id)
                    # Если нет next, завершаем дерево
                    return {'type': 'end', 'final': True}
        
        # Если тип узла не обработан, возвращаем None (404)
        return None
    
    def get_node(self, tree_id: str, node_id: str) -> Optional[Dict[str, Any]]:
        """Получает узел дерева"""
        tree = self.get_tree(tree_id)
        if not tree:
            return None
        
        if node_id == 'root':
            return self._with_node_id(tree.get('root'), 'root')
        
        nodes = tree.get('nodes', {})
        return self._with_node_id(nodes.get(node_id), node_id)
    
    def is_leaf_node(self, node: Dict[str, Any]) -> bool:
        """Проверяет, является ли узел конечным"""
        return (
            node.get('type') == 'task_trigger' or
            node.get('final', False) or
            'next' not in node and 'options' not in node
        )
    
    @staticmethod
    def _with_node_id(node: Optional[Dict[str, Any]], node_id: str) -> Optional[Dict[str, Any]]:
        """Добавляет node_id в возвращаемый узел, не мутируя исходные данные"""
        if not node:
            return None
        node_copy = dict(node)
        node_copy.setdefault('node_id', node_id)
        return node_copy
