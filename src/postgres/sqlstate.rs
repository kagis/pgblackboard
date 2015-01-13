/// http://www.postgresql.org/docs/9.4/static/errcodes-appendix.html

#[derive(Show)]
pub enum SqlStateClass {

    // Class 00
    SuccessfulCompletion,

    // Class 01
    Warning,

    // Class 02  (this is also a warning class per the SQL standard)
    NoData,

    // Class 03
    SqlStatementNotYetComplete,

    // Class 08
    ConnectionException,

    // Class 09
    TriggeredActionException,

    // Class 0A
    FeatureNotSupported,

    // Class 0B
    InvalidTransactionInitiation,

    // Class 0F
    LocatorException,

    // Class 0L
    InvalidGrantor,

    // Class 0P
    InvalidRoleSpecification,

    // Class 0Z
    DiagnosticsException,

    // Class 20
    CaseNotFound,

    // Class 21
    CardinalityViolation,

    // Class 22
    DataException,

    // Class 23
    IntegrityConstraintViolation,

    // Class 24
    InvalidCursorState,

    // Class 25
    InvalidTransactionState,

    // Class 26
    InvalidSqlStatementName,

    // Class 27
    TriggeredDataChangeViolation,

    // Class 28
    InvalidAuthorizationSpecification,

    // Class 2B
    DependentPrivilegeDescriptorsStillExist,

    // Class 2D
    InvalidTransactionTermination,

    // Class 2F
    SqlRoutineException,

    // Class 34
    InvalidCursorName,

    // Class 38
    ExternalRoutineException,

    // Class 39
    ExternalRoutineInvocationException,

    // Class 3B
    SavepointException,

    // Class 3D
    InvalidCatalogName,

    // Class 3F
    InvalidSchemaName,

    // Class 40
    TransactionRollback,

    // Class 42
    SyntaxErrorOrAccessRuleViolation,

    // Class 44
    WithCheckOptionViolation,

    // Class 53
    InsufficientResources,

    // Class 54
    ProgramLimitExceeded,

    // Class 55
    ObjectNotInPrerequisiteState,

    // Class 57
    OperatorIntervention,

    // Class 58 (errors external to PostgreSQL itself)
    SystemError,

    // Class F0
    ConfigurationFileError,

    // Class HV  (SQL/MED)
    ForeignDataWrapperError,

    // Class P0
    PlPgSqlError,

    // Class XX
    InternalError,

    Unknown(String),

}

#[derive(Show)]
#[allow(non_camel_case_types)]
pub enum SqlState {
    // Class 00 — Successful Completion

    // 00000
    SuccessfulCompletion,

    // Class 01 — Warning

    // 01000
    Warning,

    // 0100C
    DynamicResultSetsReturned,

    // 01008
    ImplicitZeroBitPadding,

    // 01003
    NullValueEliminatedInSetFunction,

    // 01007
    PrivilegeNotGranted,

    // 01006
    PrivilegeNotRevoked,

    // 01004
    Warning_StringDataRightTruncation,

    // 01P01
    DeprecatedFeature,

    // Class 02 — No Data (this is also a warning class per the SQL standard)

    // 02000
    NoData,

    // 02001
    NoAdditionalDynamicResultSetsReturned,

    // Class 03 — SQL Statement Not Yet Complete

    // 03000
    SqlStatementNotYetComplete,

    // Class 08 — Connection Exception

    // 08000
    ConnectionException,

    // 08003
    ConnectionDoesNotExist,

    // 08006
    ConnectionFailure,

    // 08001
    SqlclientUnableToEstablishSqlconnection,

    // 08004
    SqlserverRejectedEstablishmentOfSqlconnection,

    // 08007
    TransactionResolutionUnknown,

    // 08P01
    ProtocolViolation,

    // Class 09 — Triggered Action Exception

    // 09000
    TriggeredActionException,

    // Class 0A — Feature Not Supported

    // 0A000
    FeatureNotSupported,

    // Class 0B — Invalid Transaction Initiation

    // 0B000
    InvalidTransactionInitiation,

    // Class 0F — Locator Exception

    // 0F000
    LocatorException,

    // 0F001
    InvalidLocatorSpecification,

    // Class 0L — Invalid Grantor

    // 0L000
    InvalidGrantor,

    // 0LP01
    InvalidGrantOperation,

    // Class 0P — Invalid Role Specification

    // 0P000
    InvalidRoleSpecification,

    // Class 0Z — Diagnostics Exception

    // 0Z000
    DiagnosticsException,

    // 0Z002
    StackedDiagnosticsAccessedWithoutActiveHandler,

    // Class 20 — Case Not Found

    // 20000
    CaseNotFound,

    // Class 21 — Cardinality Violation

    // 21000
    CardinalityViolation,

    // Class 22 — Data Exception

    // 22000
    DataException,

    // 2202E
    ArraySubscriptError,

    // 22021
    CharacterNotInRepertoire,

    // 22008
    DatetimeFieldOverflow,

    // 22012
    DivisionByZero,

    // 22005
    ErrorInAssignment,

    // 2200B
    EscapeCharacterConflict,

    // 22022
    IndicatorOverflow,

    // 22015
    IntervalFieldOverflow,

    // 2201E
    InvalidArgumentForLogarithm,

    // 22014
    InvalidArgumentForNtileFunction,

    // 22016
    InvalidArgumentForNthValueFunction,

    // 2201F
    InvalidArgumentForPowerFunction,

    // 2201G
    InvalidArgumentForWidthBucketFunction,

    // 22018
    InvalidCharacterValueForCast,

    // 22007
    InvalidDatetimeFormat,

    // 22019
    InvalidEscapeCharacter,

    // 2200D
    InvalidEscapeOctet,

    // 22025
    InvalidEscapeSequence,

    // 22P06
    NonstandardUseOfEscapeCharacter,

    // 22010
    InvalidIndicatorParameterValue,

    // 22023
    InvalidParameterValue,

    // 2201B
    InvalidRegularExpression,

    // 2201W
    InvalidRowCountInLimitClause,

    // 2201X
    InvalidRowCountInResultOffsetClause,

    // 22009
    InvalidTimeZoneDisplacementValue,

    // 2200C
    InvalidUseOfEscapeCharacter,

    // 2200G
    MostSpecificTypeMismatch,

    // 22004
    DataException_NullValueNotAllowed,

    // 22002
    NullValueNoIndicatorParameter,

    // 22003
    NumericValueOutOfRange,

    // 22026
    StringDataLengthMismatch,

    // 22001
    DataException_StringDataRightTruncation,

    // 22011
    SubstringError,

    // 22027
    TrimError,

    // 22024
    UnterminatedCString,

    // 2200F
    ZeroLengthCharacterString,

    // 22P01
    FloatingPointException,

    // 22P02
    InvalidTextRepresentation,

    // 22P03
    InvalidBinaryRepresentation,

    // 22P04
    BadCopyFileFormat,

    // 22P05
    UntranslatableCharacter,

    // 2200L
    NotAnXmlDocument,

    // 2200M
    InvalidXmlDocument,

    // 2200N
    InvalidXmlContent,

    // 2200S
    InvalidXmlComment,

    // 2200T
    InvalidXmlProcessingInstruction,

    // Class 23 — Integrity Constraint Violation

    // 23000
    IntegrityConstraintViolation,

    // 23001
    RestrictViolation,

    // 23502
    NotNullViolation,

    // 23503
    ForeignKeyViolation,

    // 23505
    UniqueViolation,

    // 23514
    CheckViolation,

    // 23P01
    ExclusionViolation,

    // Class 24 — Invalid Cursor State

    // 24000
    InvalidCursorState,

    // Class 25 — Invalid Transaction State

    // 25000
    InvalidTransactionState,

    // 25001
    ActiveSqlTransaction,

    // 25002
    BranchTransactionAlreadyActive,

    // 25008
    HeldCursorRequiresSameIsolationLevel,

    // 25003
    InappropriateAccessModeForBranchTransaction,

    // 25004
    InappropriateIsolationLevelForBranchTransaction,

    // 25005
    NoActiveSqlTransactionForBranchTransaction,

    // 25006
    ReadOnlySqlTransaction,

    // 25007
    SchemaAndDataStatementMixingNotSupported,

    // 25P01
    NoActiveSqlTransaction,

    // 25P02
    InFailedSqlTransaction,

    // Class 26 — Invalid SQL Statement Name

    // 26000
    InvalidSqlStatementName,

    // Class 27 — Triggered Data Change Violation

    // 27000
    TriggeredDataChangeViolation,

    // Class 28 — Invalid Authorization Specification

    // 28000
    InvalidAuthorizationSpecification,

    // 28P01
    InvalidPassword,

    // Class 2B — Dependent Privilege Descriptors Still Exist

    // 2B000
    DependentPrivilegeDescriptorsStillExist,

    // 2BP01
    DependentObjectsStillExist,

    // Class 2D — Invalid Transaction Termination

    // 2D000
    InvalidTransactionTermination,

    // Class 2F — SQL Routine Exception

    // 2F000
    SqlRoutineException,

    // 2F005
    FunctionExecutedNoReturnStatement,

    // 2F002
    InvalidTransactionTermination_ModifyingSqlDataNotPermitted,

    // 2F003
    SqlRoutineException_ProhibitedSqlStatementAttempted,

    // 2F004
    SqlRoutineException_ReadingSqlDataNotPermitted,

    // Class 34 — Invalid Cursor Name

    // 34000
    InvalidCursorName,

    // Class 38 — External Routine Exception

    // 38000
    ExternalRoutineException,

    // 38001
    ContainingSqlNotPermitted,

    // 38002
    ExternalRoutineException_ModifyingSqlDataNotPermitted,

    // 38003
    ExternalRoutineException_ProhibitedSqlStatementAttempted,

    // 38004
    ExternalRoutineException_ReadingSqlDataNotPermitted,

    // Class 39 — External Routine Invocation Exception

    // 39000
    ExternalRoutineInvocationException,

    // 39001
    InvalidSqlstateReturned,

    // 39004
    ExternalRoutineInvocationException_NullValueNotAllowed,

    // 39P01
    TriggerProtocolViolated,

    // 39P02
    SrfProtocolViolated,

    // Class 3B — Savepoint Exception

    // 3B000
    SavepointException,

    // 3B001
    InvalidSavepointSpecification,

    // Class 3D — Invalid Catalog Name

    // 3D000
    InvalidCatalogName,

    // Class 3F — Invalid Schema Name

    // 3F000
    InvalidSchemaName,

    // Class 40 — Transaction Rollback

    // 40000
    TransactionRollback,

    // 40002
    TransactionIntegrityConstraintViolation,

    // 40001
    SerializationFailure,

    // 40003
    StatementCompletionUnknown,

    // 40P01
    DeadlockDetected,

    // Class 42 — Syntax Error or Access Rule Violation

    // 42000
    SyntaxErrorOrAccessRuleViolation,

    // 42601
    SyntaxError,

    // 42501
    InsufficientPrivilege,

    // 42846
    CannotCoerce,

    // 42803
    GroupingError,

    // 42P20
    WindowingError,

    // 42P19
    InvalidRecursion,

    // 42830
    InvalidForeignKey,

    // 42602
    InvalidName,

    // 42622
    NameTooLong,

    // 42939
    ReservedName,

    // 42804
    DatatypeMismatch,

    // 42P18
    IndeterminateDatatype,

    // 42P21
    CollationMismatch,

    // 42P22
    IndeterminateCollation,

    // 42809
    WrongObjectType,

    // 42703
    UndefinedColumn,

    // 42883
    UndefinedFunction,

    // 42P01
    UndefinedTable,

    // 42P02
    UndefinedParameter,

    // 42704
    UndefinedObject,

    // 42701
    DuplicateColumn,

    // 42P03
    DuplicateCursor,

    // 42P04
    DuplicateDatabase,

    // 42723
    DuplicateFunction,

    // 42P05
    DuplicatePreparedStatement,

    // 42P06
    DuplicateSchema,

    // 42P07
    DuplicateTable,

    // 42712
    DuplicateAlias,

    // 42710
    DuplicateObject,

    // 42702
    AmbiguousColumn,

    // 42725
    AmbiguousFunction,

    // 42P08
    AmbiguousParameter,

    // 42P09
    AmbiguousAlias,

    // 42P10
    InvalidColumnReference,

    // 42611
    InvalidColumnDefinition,

    // 42P11
    InvalidCursorDefinition,

    // 42P12
    InvalidDatabaseDefinition,

    // 42P13
    InvalidFunctionDefinition,

    // 42P14
    InvalidPreparedStatementDefinition,

    // 42P15
    InvalidSchemaDefinition,

    // 42P16
    InvalidTableDefinition,

    // 42P17
    InvalidObjectDefinition,

    // Class 44 — WITH CHECK OPTION Violation

    // 44000
    WithCheckOptionViolation,

    // Class 53 — Insufficient Resources

    // 53000
    InsufficientResources,

    // 53100
    DiskFull,

    // 53200
    OutOfMemory,

    // 53300
    TooManyConnections,

    // 53400
    ConfigurationLimitExceeded,

    // Class 54 — Program Limit Exceeded

    // 54000
    ProgramLimitExceeded,

    // 54001
    StatementTooComplex,

    // 54011
    TooManyColumns,

    // 54023
    TooManyArguments,

    // Class 55 — Object Not In Prerequisite State

    // 55000
    ObjectNotInPrerequisiteState,

    // 55006
    ObjectInUse,

    // 55P02
    CantChangeRuntimeParam,

    // 55P03
    LockNotAvailable,

    // Class 57 — Operator Intervention

    // 57000
    OperatorIntervention,

    // 57014
    QueryCanceled,

    // 57P01
    AdminShutdown,

    // 57P02
    CrashShutdown,

    // 57P03
    CannotConnectNow,

    // 57P04
    DatabaseDropped,

    // Class 58 — System Error (errors external to PostgreSQL itself)

    // 58000
    SystemError,

    // 58030
    IoError,

    // 58P01
    UndefinedFile,

    // 58P02
    DuplicateFile,

    // Class F0 — Configuration File Error

    // F0000
    ConfigFileError,

    // F0001
    LockFileExists,

    // Class HV — Foreign Data Wrapper Error (SQL/MED)

    // HV000
    FdwError,

    // HV005
    FdwColumnNameNotFound,

    // HV002
    FdwDynamicParameterValueNeeded,

    // HV010
    FdwFunctionSequenceError,

    // HV021
    FdwInconsistentDescriptorInformation,

    // HV024
    FdwInvalidAttributeValue,

    // HV007
    FdwInvalidColumnName,

    // HV008
    FdwInvalidColumnNumber,

    // HV004
    FdwInvalidDataType,

    // HV006
    FdwInvalidDataTypeDescriptors,

    // HV091
    FdwInvalidDescriptorFieldIdentifier,

    // HV00B
    FdwInvalidHandle,

    // HV00C
    FdwInvalidOptionIndex,

    // HV00D
    FdwInvalidOptionName,

    // HV090
    FdwInvalidStringLengthOrBufferLength,

    // HV00A
    FdwInvalidStringFormat,

    // HV009
    FdwInvalidUseOfNullPointer,

    // HV014
    FdwTooManyHandles,

    // HV001
    FdwOutOfMemory,

    // HV00P
    FdwNoSchemas,

    // HV00J
    FdwOptionNameNotFound,

    // HV00K
    FdwReplyHandle,

    // HV00Q
    FdwSchemaNotFound,

    // HV00R
    FdwTableNotFound,

    // HV00L
    FdwUnableToCreateExecution,

    // HV00M
    FdwUnableToCreateReply,

    // HV00N
    FdwUnableToEstablishConnection,

    // Class P0 — PL/pgSQL Error

    // P0000
    PlpgsqlError,

    // P0001
    RaiseException,

    // P0002
    NoDataFound,

    // P0003
    TooManyRows,

    // Class XX — Internal Error

    // XX000
    InternalError,

    // XX001
    DataCorrupted,

    // XX002
    IndexCorrupted,

    Unknown(String),
}

impl ::std::str::FromStr for SqlState {
    fn from_str(s: &str) -> Option<SqlState> {
        use self::SqlState::*;
        Some(match s {
            "00000" => SuccessfulCompletion,
            "01000" => Warning,
            "0100C" => DynamicResultSetsReturned,
            "01008" => ImplicitZeroBitPadding,
            "01003" => NullValueEliminatedInSetFunction,
            "01007" => PrivilegeNotGranted,
            "01006" => PrivilegeNotRevoked,
            "01004" => Warning_StringDataRightTruncation,
            "01P01" => DeprecatedFeature,
            "02000" => NoData,
            "02001" => NoAdditionalDynamicResultSetsReturned,
            "03000" => SqlStatementNotYetComplete,
            "08000" => ConnectionException,
            "08003" => ConnectionDoesNotExist,
            "08006" => ConnectionFailure,
            "08001" => SqlclientUnableToEstablishSqlconnection,
            "08004" => SqlserverRejectedEstablishmentOfSqlconnection,
            "08007" => TransactionResolutionUnknown,
            "08P01" => ProtocolViolation,
            "09000" => TriggeredActionException,
            "0A000" => FeatureNotSupported,
            "0B000" => InvalidTransactionInitiation,
            "0F000" => LocatorException,
            "0F001" => InvalidLocatorSpecification,
            "0L000" => InvalidGrantor,
            "0LP01" => InvalidGrantOperation,
            "0P000" => InvalidRoleSpecification,
            "0Z000" => DiagnosticsException,
            "0Z002" => StackedDiagnosticsAccessedWithoutActiveHandler,
            "20000" => CaseNotFound,
            "21000" => CardinalityViolation,
            "22000" => DataException,
            "2202E" => ArraySubscriptError,
            "22021" => CharacterNotInRepertoire,
            "22008" => DatetimeFieldOverflow,
            "22012" => DivisionByZero,
            "22005" => ErrorInAssignment,
            "2200B" => EscapeCharacterConflict,
            "22022" => IndicatorOverflow,
            "22015" => IntervalFieldOverflow,
            "2201E" => InvalidArgumentForLogarithm,
            "22014" => InvalidArgumentForNtileFunction,
            "22016" => InvalidArgumentForNthValueFunction,
            "2201F" => InvalidArgumentForPowerFunction,
            "2201G" => InvalidArgumentForWidthBucketFunction,
            "22018" => InvalidCharacterValueForCast,
            "22007" => InvalidDatetimeFormat,
            "22019" => InvalidEscapeCharacter,
            "2200D" => InvalidEscapeOctet,
            "22025" => InvalidEscapeSequence,
            "22P06" => NonstandardUseOfEscapeCharacter,
            "22010" => InvalidIndicatorParameterValue,
            "22023" => InvalidParameterValue,
            "2201B" => InvalidRegularExpression,
            "2201W" => InvalidRowCountInLimitClause,
            "2201X" => InvalidRowCountInResultOffsetClause,
            "22009" => InvalidTimeZoneDisplacementValue,
            "2200C" => InvalidUseOfEscapeCharacter,
            "2200G" => MostSpecificTypeMismatch,
            "22004" => DataException_NullValueNotAllowed,
            "22002" => NullValueNoIndicatorParameter,
            "22003" => NumericValueOutOfRange,
            "22026" => StringDataLengthMismatch,
            "22001" => DataException_StringDataRightTruncation,
            "22011" => SubstringError,
            "22027" => TrimError,
            "22024" => UnterminatedCString,
            "2200F" => ZeroLengthCharacterString,
            "22P01" => FloatingPointException,
            "22P02" => InvalidTextRepresentation,
            "22P03" => InvalidBinaryRepresentation,
            "22P04" => BadCopyFileFormat,
            "22P05" => UntranslatableCharacter,
            "2200L" => NotAnXmlDocument,
            "2200M" => InvalidXmlDocument,
            "2200N" => InvalidXmlContent,
            "2200S" => InvalidXmlComment,
            "2200T" => InvalidXmlProcessingInstruction,
            "23000" => IntegrityConstraintViolation,
            "23001" => RestrictViolation,
            "23502" => NotNullViolation,
            "23503" => ForeignKeyViolation,
            "23505" => UniqueViolation,
            "23514" => CheckViolation,
            "23P01" => ExclusionViolation,
            "24000" => InvalidCursorState,
            "25000" => InvalidTransactionState,
            "25001" => ActiveSqlTransaction,
            "25002" => BranchTransactionAlreadyActive,
            "25008" => HeldCursorRequiresSameIsolationLevel,
            "25003" => InappropriateAccessModeForBranchTransaction,
            "25004" => InappropriateIsolationLevelForBranchTransaction,
            "25005" => NoActiveSqlTransactionForBranchTransaction,
            "25006" => ReadOnlySqlTransaction,
            "25007" => SchemaAndDataStatementMixingNotSupported,
            "25P01" => NoActiveSqlTransaction,
            "25P02" => InFailedSqlTransaction,
            "26000" => InvalidSqlStatementName,
            "27000" => TriggeredDataChangeViolation,
            "28000" => InvalidAuthorizationSpecification,
            "28P01" => InvalidPassword,
            "2B000" => DependentPrivilegeDescriptorsStillExist,
            "2BP01" => DependentObjectsStillExist,
            "2D000" => InvalidTransactionTermination,
            "2F000" => SqlRoutineException,
            "2F005" => FunctionExecutedNoReturnStatement,
            "2F002" => InvalidTransactionTermination_ModifyingSqlDataNotPermitted,
            "2F003" => SqlRoutineException_ProhibitedSqlStatementAttempted,
            "2F004" => SqlRoutineException_ReadingSqlDataNotPermitted,
            "34000" => InvalidCursorName,
            "38000" => ExternalRoutineException,
            "38001" => ContainingSqlNotPermitted,
            "38002" => ExternalRoutineException_ModifyingSqlDataNotPermitted,
            "38003" => ExternalRoutineException_ProhibitedSqlStatementAttempted,
            "38004" => ExternalRoutineException_ReadingSqlDataNotPermitted,
            "39000" => ExternalRoutineInvocationException,
            "39001" => InvalidSqlstateReturned,
            "39004" => ExternalRoutineInvocationException_NullValueNotAllowed,
            "39P01" => TriggerProtocolViolated,
            "39P02" => SrfProtocolViolated,
            "3B000" => SavepointException,
            "3B001" => InvalidSavepointSpecification,
            "3D000" => InvalidCatalogName,
            "3F000" => InvalidSchemaName,
            "40000" => TransactionRollback,
            "40002" => TransactionIntegrityConstraintViolation,
            "40001" => SerializationFailure,
            "40003" => StatementCompletionUnknown,
            "40P01" => DeadlockDetected,
            "42000" => SyntaxErrorOrAccessRuleViolation,
            "42601" => SyntaxError,
            "42501" => InsufficientPrivilege,
            "42846" => CannotCoerce,
            "42803" => GroupingError,
            "42P20" => WindowingError,
            "42P19" => InvalidRecursion,
            "42830" => InvalidForeignKey,
            "42602" => InvalidName,
            "42622" => NameTooLong,
            "42939" => ReservedName,
            "42804" => DatatypeMismatch,
            "42P18" => IndeterminateDatatype,
            "42P21" => CollationMismatch,
            "42P22" => IndeterminateCollation,
            "42809" => WrongObjectType,
            "42703" => UndefinedColumn,
            "42883" => UndefinedFunction,
            "42P01" => UndefinedTable,
            "42P02" => UndefinedParameter,
            "42704" => UndefinedObject,
            "42701" => DuplicateColumn,
            "42P03" => DuplicateCursor,
            "42P04" => DuplicateDatabase,
            "42723" => DuplicateFunction,
            "42P05" => DuplicatePreparedStatement,
            "42P06" => DuplicateSchema,
            "42P07" => DuplicateTable,
            "42712" => DuplicateAlias,
            "42710" => DuplicateObject,
            "42702" => AmbiguousColumn,
            "42725" => AmbiguousFunction,
            "42P08" => AmbiguousParameter,
            "42P09" => AmbiguousAlias,
            "42P10" => InvalidColumnReference,
            "42611" => InvalidColumnDefinition,
            "42P11" => InvalidCursorDefinition,
            "42P12" => InvalidDatabaseDefinition,
            "42P13" => InvalidFunctionDefinition,
            "42P14" => InvalidPreparedStatementDefinition,
            "42P15" => InvalidSchemaDefinition,
            "42P16" => InvalidTableDefinition,
            "42P17" => InvalidObjectDefinition,
            "44000" => WithCheckOptionViolation,
            "53000" => InsufficientResources,
            "53100" => DiskFull,
            "53200" => OutOfMemory,
            "53300" => TooManyConnections,
            "53400" => ConfigurationLimitExceeded,
            "54000" => ProgramLimitExceeded,
            "54001" => StatementTooComplex,
            "54011" => TooManyColumns,
            "54023" => TooManyArguments,
            "55000" => ObjectNotInPrerequisiteState,
            "55006" => ObjectInUse,
            "55P02" => CantChangeRuntimeParam,
            "55P03" => LockNotAvailable,
            "57000" => OperatorIntervention,
            "57014" => QueryCanceled,
            "57P01" => AdminShutdown,
            "57P02" => CrashShutdown,
            "57P03" => CannotConnectNow,
            "57P04" => DatabaseDropped,
            "58000" => SystemError,
            "58030" => IoError,
            "58P01" => UndefinedFile,
            "58P02" => DuplicateFile,
            "F0000" => ConfigFileError,
            "F0001" => LockFileExists,
            "HV000" => FdwError,
            "HV005" => FdwColumnNameNotFound,
            "HV002" => FdwDynamicParameterValueNeeded,
            "HV010" => FdwFunctionSequenceError,
            "HV021" => FdwInconsistentDescriptorInformation,
            "HV024" => FdwInvalidAttributeValue,
            "HV007" => FdwInvalidColumnName,
            "HV008" => FdwInvalidColumnNumber,
            "HV004" => FdwInvalidDataType,
            "HV006" => FdwInvalidDataTypeDescriptors,
            "HV091" => FdwInvalidDescriptorFieldIdentifier,
            "HV00B" => FdwInvalidHandle,
            "HV00C" => FdwInvalidOptionIndex,
            "HV00D" => FdwInvalidOptionName,
            "HV090" => FdwInvalidStringLengthOrBufferLength,
            "HV00A" => FdwInvalidStringFormat,
            "HV009" => FdwInvalidUseOfNullPointer,
            "HV014" => FdwTooManyHandles,
            "HV001" => FdwOutOfMemory,
            "HV00P" => FdwNoSchemas,
            "HV00J" => FdwOptionNameNotFound,
            "HV00K" => FdwReplyHandle,
            "HV00Q" => FdwSchemaNotFound,
            "HV00R" => FdwTableNotFound,
            "HV00L" => FdwUnableToCreateExecution,
            "HV00M" => FdwUnableToCreateReply,
            "HV00N" => FdwUnableToEstablishConnection,
            "P0000" => PlpgsqlError,
            "P0001" => RaiseException,
            "P0002" => NoDataFound,
            "P0003" => TooManyRows,
            "XX000" => InternalError,
            "XX001" => DataCorrupted,
            "XX002" => IndexCorrupted,
            unknown => Unknown(unknown.to_string()),
        })
    }
}

impl ::std::str::FromStr for SqlStateClass {
    fn from_str(s: &str) -> Option<SqlStateClass> {
        use self::SqlStateClass::*;
        Some(match s {
            "00" =>    SuccessfulCompletion,
            "01" =>    Warning,
            "02" =>    NoData,
            "03" =>    SqlStatementNotYetComplete,
            "08" =>    ConnectionException,
            "09" =>    TriggeredActionException,
            "0A" =>    FeatureNotSupported,
            "0B" =>    InvalidTransactionInitiation,
            "0F" =>    LocatorException,
            "0L" =>    InvalidGrantor,
            "0P" =>    InvalidRoleSpecification,
            "0Z" =>    DiagnosticsException,
            "20" =>    CaseNotFound,
            "21" =>    CardinalityViolation,
            "22" =>    DataException,
            "23" =>    IntegrityConstraintViolation,
            "24" =>    InvalidCursorState,
            "25" =>    InvalidTransactionState,
            "26" =>    InvalidSqlStatementName,
            "27" =>    TriggeredDataChangeViolation,
            "28" =>    InvalidAuthorizationSpecification,
            "2B" =>    DependentPrivilegeDescriptorsStillExist,
            "2D" =>    InvalidTransactionTermination,
            "2F" =>    SqlRoutineException,
            "34" =>    InvalidCursorName,
            "38" =>    ExternalRoutineException,
            "39" =>    ExternalRoutineInvocationException,
            "3B" =>    SavepointException,
            "3D" =>    InvalidCatalogName,
            "3F" =>    InvalidSchemaName,
            "40" =>    TransactionRollback,
            "42" =>    SyntaxErrorOrAccessRuleViolation,
            "44" =>    WithCheckOptionViolation,
            "53" =>    InsufficientResources,
            "54" =>    ProgramLimitExceeded,
            "55" =>    ObjectNotInPrerequisiteState,
            "57" =>    OperatorIntervention,
            "58" =>    SystemError,
            "F0" =>    ConfigurationFileError,
            "HV" =>    ForeignDataWrapperError,
            "P0" =>    PlPgSqlError,
            "XX" =>    InternalError,
            unknown => Unknown(unknown.to_string()),
        })
    }
}

impl ::std::str::FromStr for (SqlStateClass, SqlState) {
    fn from_str(s: &str) -> Option<(SqlStateClass, SqlState)> {
        Some((s[0..2].parse().unwrap(), s.parse().unwrap()))
    }
}



// fn parse_sqlstate(code: [u8; 5]) -> (SqlStateClass, SqlState) {
//     match &code[0..2] {
//             "00" =>    (SuccessfulCompletion, match code {

//             }),
//             "01" =>    (Warning, match code {

//             }),
//             "02" =>    (NoData, match code {

//             }),
//             "03" =>    (SqlStatementNotYetComplete, match code {

//             }),
//             "08" =>    (ConnectionException, match code {

//             }),
//             "09" =>    (TriggeredActionException, match code {

//             }),
//             "0A" =>    (FeatureNotSupported, match code {

//             }),
//             "0B" =>    (InvalidTransactionInitiation, match code {

//             }),
//             "0F" =>    (LocatorException, match code {

//             }),
//             "0L" =>    (InvalidGrantor, match code {

//             }),
//             "0P" =>    (InvalidRoleSpecification, match code {

//             }),
//             "0Z" =>    (DiagnosticsException, match code {

//             }),
//             "20" =>    (CaseNotFound, match code {

//             }),
//             "21" =>    (CardinalityViolation, match code {

//             }),
//             "22" =>    (DataException, match code {

//             }),
//             "23" =>    (IntegrityConstraintViolation, match code {

//             }),
//             "24" =>    (InvalidCursorState, match code {

//             }),
//             "25" =>    (InvalidTransactionState, match code {

//             }),
//             "26" =>    (InvalidSqlStatementName, match code {

//             }),
//             "27" =>    (TriggeredDataChangeViolation, match code {

//             }),
//             "28" =>    (InvalidAuthorizationSpecification, match code {

//             }),
//             "2B" =>    (DependentPrivilegeDescriptorsStillExist, match code {

//             }),
//             "2D" =>    (InvalidTransactionTermination, match code {

//             }),
//             "2F" =>    (SqlRoutineException, match code {

//             }),
//             "34" =>    (InvalidCursorName, match code {

//             }),
//             "38" =>    (ExternalRoutineException, match code {

//             }),
//             "39" =>    (ExternalRoutineInvocationException, match code {

//             }),
//             "3B" =>    (SavepointException, match code {

//             }),
//             "3D" =>    (InvalidCatalogName, match code {

//             }),
//             "3F" =>    (InvalidSchemaName, match code {

//             }),
//             "40" =>    (TransactionRollback, match code {

//             }),
//             "42" =>    (SyntaxErrorOrAccessRuleViolation, match code {

//             }),
//             "44" =>    (WithCheckOptionViolation, match code {

//             }),
//             "53" =>    (InsufficientResources, match code {

//             }),
//             "54" =>    (ProgramLimitExceeded, match code {

//             }),
//             "55" =>    (ObjectNotInPrerequisiteState, match code {

//             }),
//             "57" =>    (OperatorIntervention, match code {

//             }),
//             "58" =>    (SystemError, match code {

//             }),
//             "F0" =>    (ConfigurationFileError, match code {

//             }),
//             "HV" =>    (ForeignDataWrapperError, match code {

//             }),
//             "P0" =>    (PlPgSqlError, match code {

//             }),
//             "XX" =>    (InternalError, match code {

//             }),
//             unknown => Unknown(unknown.to_string()),
//         }
// }