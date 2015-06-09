/// http://postgresql.org/docs/9.4/static/errcodes-appendix.html

macro_rules! sql_state {
    ( $( $code_pref:expr => $class_name:ident {
        $( $code_suffix:expr => $name:ident ),*
    }),* ) => {

        $(
            #[derive(Debug)]
            #[derive(PartialEq)]
            pub enum $class_name {
                $( $name, )*
                Unknown
            }
        )*


        #[derive(Debug)]
        #[derive(PartialEq)]
        pub enum SqlState {
            $( $class_name(Option<$class_name>), )*
            Unknown
        }

        impl SqlState {
            pub fn from_code(code: &str) -> SqlState {
                let class_code = &code[..2];
                let code_suffix = &code[2..];
                match class_code {
                    $(
                        $code_pref => SqlState::$class_name(match code_suffix {
                            "000" => None,
                            $( $code_suffix => Some($class_name::$name), )*
                            _ => Some($class_name::Unknown)
                        }),
                    )*
                    _ => SqlState::Unknown
                }
            }
        }
    };
}

sql_state!{
    "00" => SuccessfulCompletion {},
    "01" => Warning {
        "00C" => DynamicResultSetsReturned,
        "008" => ImplicitZeroBitPadding,
        "003" => NullValueEliminatedInSetFunction,
        "007" => PrivilegeNotGranted,
        "006" => PrivilegeNotRevoked,
        "004" => StringDataRightTruncation,
        "P01" => DeprecatedFeature
    },

    "02" => NoData {
        "001" => NoAdditionalDynamicResultSetsReturned
    },

    //Class 03 — SQL Statement Not Yet Complete

    "03" => SqlStatementNotYetComplete {

    },

    //Class 08 — Connection Exception

    "08" => ConnectionException {
        "003" => ConnectionDoesNotExist,
        "006" => ConnectionFailure,
        "001" => SqlclientUnableToEstablishSqlconnection,
        "004" => SqlserverRejectedEstablishmentOfSqlconnection,
        "007" => TransactionResolutionUnknown,
        "P01" => ProtocolViolation
    },

    //Class 09 — Triggered Action Exception

    "09" => TriggeredActionException {

    },

    //Class 0A — Feature Not Supported

    "0A" => FeatureNotSupported {

    },

    //Class 0B — Invalid Transaction Initiation

    "0B" => InvalidTransactionInitiation {

    },

    //Class 0F — Locator Exception

    "0F" => LocatorException {
        "001" => InvalidLocatorSpecification
    },

    //Class 0L — Invalid Grantor

    "0L" => InvalidGrantor {
        "P01" => InvalidGrantOperation
    },

    //Class 0P — Invalid Role Specification

    "0P" => InvalidRoleSpecification {

    },

    //Class 0Z — Diagnostics Exception

    "0Z" => DiagnosticsException {
        "002" => StackedDiagnosticsAccessedWithoutActiveHandler
    },

    //Class 20 — Case Not Found

    "20" => CaseNotFound {

    },

    //Class 21 — Cardinality Violation

    "21" => CardinalityViolation {

    },

    //Class 22 — Data Exception

    "22" => DataException {
        "02E" => ArraySubscriptError,
        "021" => CharacterNotInRepertoire,
        "008" => DatetimeFieldOverflow,
        "012" => DivisionByZero,
        "005" => ErrorInAssignment,
        "00B" => EscapeCharacterConflict,
        "022" => IndicatorOverflow,
        "015" => IntervalFieldOverflow,
        "01E" => InvalidArgumentForLogarithm,
        "014" => InvalidArgumentForNtileFunction,
        "016" => InvalidArgumentForNthValueFunction,
        "01F" => InvalidArgumentForPowerFunction,
        "01G" => InvalidArgumentForWidthBucketFunction,
        "018" => InvalidCharacterValueForCast,
        "007" => InvalidDatetimeFormat,
        "019" => InvalidEscapeCharacter,
        "00D" => InvalidEscapeOctet,
        "025" => InvalidEscapeSequence,
        "P06" => NonstandardUseOfEscapeCharacter,
        "010" => InvalidIndicatorParameterValue,
        "023" => InvalidParameterValue,
        "01B" => InvalidRegularExpression,
        "01W" => InvalidRowCountInLimitClause,
        "01X" => InvalidRowCountInResultOffsetClause,
        "009" => InvalidTimeZoneDisplacementValue,
        "00C" => InvalidUseOfEscapeCharacter,
        "00G" => MostSpecificTypeMismatch,
        "004" => NullValueNotAllowed,
        "002" => NullValueNoIndicatorParameter,
        "003" => NumericValueOutOfRange,
        "026" => StringDataLengthMismatch,
        "001" => StringDataRightTruncation,
        "011" => SubstringError,
        "027" => TrimError,
        "024" => UnterminatedCString,
        "00F" => ZeroLengthCharacterString,
        "P01" => FloatingPointException,
        "P02" => InvalidTextRepresentation,
        "P03" => InvalidBinaryRepresentation,
        "P04" => BadCopyFileFormat,
        "P05" => UntranslatableCharacter,
        "00L" => NotAnXmlDocument,
        "00M" => InvalidXmlDocument,
        "00N" => InvalidXmlContent,
        "00S" => InvalidXmlComment,
        "00T" => InvalidXmlProcessingInstruction
    },

    //Class 23 — Integrity Constraint Violation

    "23" => IntegrityConstraintViolation {
        "001" => RestrictViolation,
        "502" => NotNullViolation,
        "503" => ForeignKeyViolation,
        "505" => UniqueViolation,
        "514" => CheckViolation,
        "P01" => ExclusionViolation
    },

    //Class 24 — Invalid Cursor State

    "24" => InvalidCursorState {

    },

    //Class 25 — Invalid Transaction State

    "25" => InvalidTransactionState {
        "001" => ActiveSqlTransaction,
        "002" => BranchTransactionAlreadyActive,
        "008" => HeldCursorRequiresSameIsolationLevel,
        "003" => InappropriateAccessModeForBranchTransaction,
        "004" => InappropriateIsolationLevelForBranchTransaction,
        "005" => NoActiveSqlTransactionForBranchTransaction,
        "006" => ReadOnlySqlTransaction,
        "007" => SchemaAndDataStatementMixingNotSupported,
        "P01" => NoActiveSqlTransaction,
        "P02" => InFailedSqlTransaction
    },

    //Class 26 — Invalid SQL Statement Name

    "26" => InvalidSqlStatementName {

    },

    //Class 27 — Triggered Data Change Violation

    "27" => TriggeredDataChangeViolation {

    },

    //Class 28 — Invalid Authorization Specification

    "28" => InvalidAuthorizationSpecification {
        "P01" => InvalidPassword
    },

    //Class 2B — Dependent Privilege Descriptors Still Exist

    "2B" => DependentPrivilegeDescriptorsStillExist {
        "P01" => DependentObjectsStillExist
    },

    //Class 2D — Invalid Transaction Termination

    "2D" => InvalidTransactionTermination {

    },

    //Class 2F — SQL Routine Exception

    "2F" => SqlRoutineException {
        "005" => FunctionExecutedNoReturnStatement,
        "002" => ModifyingSqlDataNotPermitted,
        "003" => ProhibitedSqlStatementAttempted,
        "004" => ReadingSqlDataNotPermitted
    },

    //Class 34 — Invalid Cursor Name

    "34" => InvalidCursorName {

    },

    //Class 38 — External Routine Exception

    "38" => ExternalRoutineException {
        "001" => ContainingSqlNotPermitted,
        "002" => ModifyingSqlDataNotPermitted,
        "003" => ProhibitedSqlStatementAttempted,
        "004" => ReadingSqlDataNotPermitted
    },

    //Class 39 — External Routine Invocation Exception

    "39" => ExternalRoutineInvocationException {
        "001" => InvalidSqlstateReturned,
        "004" => NullValueNotAllowed,
        "P01" => TriggerProtocolViolated,
        "P02" => SrfProtocolViolated
    },
    //Class 3B — Savepoint Exception

    "3B" => SavepointException {
        "001" => InvalidSavepointSpecification
    },

    //Class 3D — Invalid Catalog Name

    "3D" => InvalidCatalogName {

    },

    //Class 3F — Invalid Schema Name

    "3F" => InvalidSchemaName {

    },

    //Class 40 — Transaction Rollback

    "40" => TransactionRollback {
        "002" => TransactionIntegrityConstraintViolation,
        "001" => SerializationFailure,
        "003" => StatementCompletionUnknown,
        "P01" => DeadlockDetected
    },

    //Class 42 — Syntax Error or Access Rule Violation

    "42" => SyntaxErrorOrAccessRuleViolation {
        "601" => SyntaxError,
        "501" => InsufficientPrivilege,
        "846" => CannotCoerce,
        "803" => GroupingError,
        "P20" => WindowingError,
        "P19" => InvalidRecursion,
        "830" => InvalidForeignKey,
        "602" => InvalidName,
        "622" => NameTooLong,
        "939" => ReservedName,
        "804" => DatatypeMismatch,
        "P18" => IndeterminateDatatype,
        "P21" => CollationMismatch,
        "P22" => IndeterminateCollation,
        "809" => WrongObjectType,
        "703" => UndefinedColumn,
        "883" => UndefinedFunction,
        "P01" => UndefinedTable,
        "P02" => UndefinedParameter,
        "704" => UndefinedObject,
        "701" => DuplicateColumn,
        "P03" => DuplicateCursor,
        "P04" => DuplicateDatabase,
        "723" => DuplicateFunction,
        "P05" => DuplicatePreparedStatement,
        "P06" => DuplicateSchema,
        "P07" => DuplicateTable,
        "712" => DuplicateAlias,
        "710" => DuplicateObject,
        "702" => AmbiguousColumn,
        "725" => AmbiguousFunction,
        "P08" => AmbiguousParameter,
        "P09" => AmbiguousAlias,
        "P10" => InvalidColumnReference,
        "611" => InvalidColumnDefinition,
        "P11" => InvalidCursorDefinition,
        "P12" => InvalidDatabaseDefinition,
        "P13" => InvalidFunctionDefinition,
        "P14" => InvalidPreparedStatementDefinition,
        "P15" => InvalidSchemaDefinition,
        "P16" => InvalidTableDefinition,
        "P17" => InvalidObjectDefinition
    },

    //Class 44 — WITH CHECK OPTION Violation

    "44" => WithCheckOptionViolation {

    },

    //Class 53 — Insufficient Resources

    "53" => InsufficientResources {
        "100" => DiskFull,
        "200" => OutOfMemory,
        "300" => TooManyConnections,
        "400" => ConfigurationLimitExceeded
    },

    //Class 54 — Program Limit Exceeded

    "54" => ProgramLimitExceeded {
        "001" => StatementTooComplex,
        "011" => TooManyColumns,
        "023" => TooManyArguments
    },

    //Class 55 — Object Not In Prerequisite State

    "55" => ObjectNotInPrerequisiteState {
        "006" => ObjectInUse,
        "P02" => CantChangeRuntimeParam,
        "P03" => LockNotAvailable
    },

    //Class 57 — Operator Intervention

    "57" => OperatorIntervention {
        "014" => QueryCanceled,
        "P01" => AdminShutdown,
        "P02" => CrashShutdown,
        "P03" => CannotConnectNow,
        "P04" => DatabaseDropped
    },

    //Class 58 — System Error (errors external to PostgreSQL itself)

    "58" => SystemError {
        "030" => IoError,
        "P01" => UndefinedFile,
        "P02" => DuplicateFile
    },

    //Class F0 — Configuration File Error

    "F0" => ConfigFileError {
        "001" => LockFileExists
    },

    //Class HV — Foreign Data Wrapper Error (SQL/MED)

    "HV" => FdwError {
        "005" => FdwColumnNameNotFound,
        "002" => FdwDynamicParameterValueNeeded,
        "010" => FdwFunctionSequenceError,
        "021" => FdwInconsistentDescriptorInformation,
        "024" => FdwInvalidAttributeValue,
        "007" => FdwInvalidColumnName,
        "008" => FdwInvalidColumnNumber,
        "004" => FdwInvalidDataType,
        "006" => FdwInvalidDataTypeDescriptors,
        "091" => FdwInvalidDescriptorFieldIdentifier,
        "00B" => FdwInvalidHandle,
        "00C" => FdwInvalidOptionIndex,
        "00D" => FdwInvalidOptionName,
        "090" => FdwInvalidStringLengthOrBufferLength,
        "00A" => FdwInvalidStringFormat,
        "009" => FdwInvalidUseOfNullPointer,
        "014" => FdwTooManyHandles,
        "001" => FdwOutOfMemory,
        "00P" => FdwNoSchemas,
        "00J" => FdwOptionNameNotFound,
        "00K" => FdwReplyHandle,
        "00Q" => FdwSchemaNotFound,
        "00R" => FdwTableNotFound,
        "00L" => FdwUnableToCreateExecution,
        "00M" => FdwUnableToCreateReply,
        "00N" => FdwUnableToEstablishConnection
    },

    //Class P0 — PL/pgSQL Error

    "P0" => PlpgsqlError {
        "001" => RaiseException,
        "002" => NoDataFound,
        "003" => TooManyRows
    },

    //Class XX — Internal Error

    "XX" => InternalError {
        "001" => DataCorrupted,
        "002" => IndexCorrupted
    }
}


// fn main() {
//     let sqlstate = SqlState::from_code("28P01");

//     println!("{:?}", sqlstate);
//     match sqlstate {
//         SqlState::InvalidAuthorizationSpecification(Some(InvalidAuthorizationSpecification::InvalidPassword)) => {
//             println!("got it 2");
//         },
//         SqlState::InvalidAuthorizationSpecification(..) => {
//             println!("got it");
//         },
//         _ => unreachable!()
//     };
// }
