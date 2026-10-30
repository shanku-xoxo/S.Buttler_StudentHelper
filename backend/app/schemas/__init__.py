from app.schemas.academic import (
    AcademicYearCreate, AcademicYearResponse,
    SemesterCreate, SemesterResponse,
    SubjectCreate, SubjectResponse,
    ModuleCreate, ModuleResponse
)
from app.schemas.document import (
    DocumentResponse, DocumentSearchResult,
    NoteCreate, NoteUpdate, NoteResponse
)
from app.schemas.calendar import (
    CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse
)
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    WorkloadSummary, DynamicRedistributionRequest,
    ProgressRecordCreate, ProgressRecordResponse
)
from app.schemas.ai import (
    ChatMessageRequest, ChatResponse,
    ProposedActionResponse, ActionConfirmationRequest,
    NoteGenerationRequest, ModuleSummaryRequest
)

__all__ = [
    "AcademicYearCreate", "AcademicYearResponse",
    "SemesterCreate", "SemesterResponse",
    "SubjectCreate", "SubjectResponse",
    "ModuleCreate", "ModuleResponse",
    "DocumentResponse", "DocumentSearchResult",
    "NoteCreate", "NoteUpdate", "NoteResponse",
    "CalendarEventCreate", "CalendarEventUpdate", "CalendarEventResponse",
    "TaskCreate", "TaskUpdate", "TaskResponse",
    "WorkloadSummary", "DynamicRedistributionRequest",
    "ProgressRecordCreate", "ProgressRecordResponse",
    "ChatMessageRequest", "ChatResponse",
    "ProposedActionResponse", "ActionConfirmationRequest",
    "NoteGenerationRequest", "ModuleSummaryRequest",
]
