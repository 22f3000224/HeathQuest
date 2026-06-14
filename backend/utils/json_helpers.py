"""
JSON data helpers for database operations
"""
import json
from datetime import date, datetime
from typing import Dict, Any, List, Optional

class DailyLogHelper:
    @staticmethod
    def add_daily_entry(existing_data: str, date_str: str, log_data: Dict[str, Any]) -> str:
        """Add a new daily log entry"""
        data = json.loads(existing_data) if existing_data else {}
        data[date_str] = log_data
        return json.dumps(data)
    
    @staticmethod
    def get_daily_entry(existing_data: str, date_str: str) -> Optional[Dict[str, Any]]:
        """Get a specific day's log"""
        data = json.loads(existing_data) if existing_data else {}
        return data.get(date_str)
    
    @staticmethod
    def get_date_range(existing_data: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get logs for a date range"""
        data = json.loads(existing_data) if existing_data else {}
        return {k: v for k, v in data.items() if start_date <= k <= end_date}
    
    @staticmethod
    def get_recent_logs(existing_data: str, days: int = 7) -> Dict[str, Any]:
        """Get recent logs"""
        data = json.loads(existing_data) if existing_data else {}
        sorted_dates = sorted(data.keys(), reverse=True)
        return {k: data[k] for k in sorted_dates[:days]}

class ChronicleHelper:
    @staticmethod
    def add_entry(existing_data: str, entry_data: Dict[str, Any]) -> str:
        """Add a new chronicle entry"""
        data = json.loads(existing_data) if existing_data else {"entries": []}
        if "entries" not in data:
            data["entries"] = []
        data["entries"].append(entry_data)
        return json.dumps(data)
    
    @staticmethod
    def get_entries(existing_data: str) -> List[Dict[str, Any]]:
        """Get all chronicle entries"""
        data = json.loads(existing_data) if existing_data else {"entries": []}
        return data.get("entries", [])
    
    @staticmethod
    def get_by_week(existing_data: str, week_number: int) -> List[Dict[str, Any]]:
        """Get entries for a specific week"""
        entries = ChronicleHelper.get_entries(existing_data)
        return [e for e in entries if e.get("week_number") == week_number]

class ArtifactHelper:
    @staticmethod
    def add_artifact(existing_data: str, artifact_data: Dict[str, Any]) -> str:
        """Add a new artifact"""
        data = json.loads(existing_data) if existing_data else {"artifacts": []}
        if "artifacts" not in data:
            data["artifacts"] = []
        data["artifacts"].append(artifact_data)
        return json.dumps(data)
    
    @staticmethod
    def unlock_artifact(existing_data: str, artifact_name: str) -> str:
        """Unlock an artifact by name"""
        data = json.loads(existing_data) if existing_data else {"artifacts": []}
        for artifact in data.get("artifacts", []):
            if artifact.get("artifact_name") == artifact_name:
                artifact["unlocked"] = True
                artifact["unlocked_at"] = datetime.now().isoformat()
                break
        return json.dumps(data)
    
    @staticmethod
    def get_unlocked_artifacts(existing_data: str) -> List[Dict[str, Any]]:
        """Get all unlocked artifacts"""
        data = json.loads(existing_data) if existing_data else {"artifacts": []}
        return [a for a in data.get("artifacts", []) if a.get("unlocked", False)]

class MemoryHelper:
    @staticmethod
    def add_memory(existing_data: str, memory_data: Dict[str, Any]) -> str:
        """Add a new memory"""
        data = json.loads(existing_data) if existing_data else {"memories": []}
        if "memories" not in data:
            data["memories"] = []
        data["memories"].append(memory_data)
        return json.dumps(data)
    
    @staticmethod
    def get_memories_by_type(existing_data: str, memory_type: str) -> List[Dict[str, Any]]:
        """Get memories of a specific type"""
        data = json.loads(existing_data) if existing_data else {"memories": []}
        return [m for m in data.get("memories", []) if m.get("memory_type") == memory_type]
    
    @staticmethod
    def get_high_importance_memories(existing_data: str, min_score: int = 8) -> List[Dict[str, Any]]:
        """Get high importance memories"""
        data = json.loads(existing_data) if existing_data else {"memories": []}
        return [m for m in data.get("memories", []) if m.get("importance_score", 0) >= min_score]

class StorybookHelper:
    @staticmethod
    def add_chapter(existing_data: str, chapter_data: Dict[str, Any]) -> str:
        """Add a new storybook chapter"""
        data = json.loads(existing_data) if existing_data else {"chapters": []}
        if "chapters" not in data:
            data["chapters"] = []
        data["chapters"].append(chapter_data)
        return json.dumps(data)
    
    @staticmethod
    def get_chapter(existing_data: str, chapter_number: int) -> Optional[Dict[str, Any]]:
        """Get a specific chapter"""
        data = json.loads(existing_data) if existing_data else {"chapters": []}
        for chapter in data.get("chapters", []):
            if chapter.get("chapter_number") == chapter_number:
                return chapter
        return None
    
    @staticmethod
    def get_all_chapters(existing_data: str) -> List[Dict[str, Any]]:
        """Get all chapters sorted by chapter number"""
        data = json.loads(existing_data) if existing_data else {"chapters": []}
        chapters = data.get("chapters", [])
        return sorted(chapters, key=lambda x: x.get("chapter_number", 0))