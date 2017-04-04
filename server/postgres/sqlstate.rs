macro_rules! sql_state {
    ( $( $code_pref:expr => $class_name:ident {
        $( $code_suffix:expr => $name:ident ),*
    }),* ) => {

        /// http://postgresql.org/docs/9.4/static/errcodes-appendix.html
        #[derive(Debug)]
        #[derive(PartialEq)]
        #[derive(Serialize)]
        pub enum SqlState {
            $(
                $class_name,
                $( $name, )*
            )*
            Unknown
        }

        #[derive(Debug)]
        #[derive(PartialEq)]
        pub enum SqlStateClass {
            $( $class_name, )*
            Unknown
        }

        impl SqlState {
            pub fn from_code(code: &str) -> SqlState {
                match code {
                    $(
                        concat!($code_pref, "000") => SqlState::$class_name,
                        $( concat!($code_pref, $code_suffix) => SqlState::$name, )*
                    )*
                    _ => SqlState::Unknown
                }
            }

            pub fn class(&self) -> SqlStateClass {
                match *self {
                    $(
                        SqlState::$class_name
                        $( | SqlState::$name )*
                        => SqlStateClass::$class_name,
                    )*
                    _ => SqlStateClass::Unknown
                }
            }
        }
    };
}

sql_state! {
    "00" => SuccessfulCompletion {

    },

    "01" => Warning {
        "00C" => DynamicResultSetsReturned,
        "008" => ImplicitZeroBitPadding,
        "003" => NullValueEliminatedInSetFunction,
        "007" => PrivilegeNotGranted,
        "006" => PrivilegeNotRevoked,
        "004" => StringDataRightTruncationWarning,
        "P01" => DeprecatedFeature
    },

    "02" => NoData {
        "001" => NoAdditionalDynamicResultSetsReturned
    },

    "03" => SqlStatementNotYetComplete {

    },

    "08" => ConnectionException {
        "003" => ConnectionDoesNotExist,
        "006" => ConnectionFailure,
        "001" => SqlclientUnableToEstablishSqlconnection,
        "004" => SqlserverRejectedEstablishmentOfSqlconnection,
        "007" => TransactionResolutionUnknown,
        "P01" => ProtocolViolation
    },

    "09" => TriggeredActionException {

    },

    "0A" => FeatureNotSupported {

    },

    "0B" => InvalidTransactionInitiation {

    },

    "0F" => LocatorException {
        "001" => InvalidLocatorSpecification
    },

    "0L" => InvalidGrantor {
        "P01" => InvalidGrantOperation
    },

    "0P" => InvalidRoleSpecification {

    },

    "0Z" => DiagnosticsException {
        "002" => StackedDiagnosticsAccessedWithoutActiveHandler
    },

    "20" => CaseNotFound {

    },

    "21" => CardinalityViolation {

    },

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
        "004" => NullValueNotAllowedDataException,
        "002" => NullValueNoIndicatorParameter,
        "003" => NumericValueOutOfRange,
        "026" => StringDataLengthMismatch,
        "001" => StringDataRightTruncationDataException,
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

    "23" => IntegrityConstraintViolation {
        "001" => RestrictViolation,
        "502" => NotNullViolation,
        "503" => ForeignKeyViolation,
        "505" => UniqueViolation,
        "514" => CheckViolation,
        "P01" => ExclusionViolation
    },

    "24" => InvalidCursorState {

    },

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

    "26" => InvalidSqlStatementName {

    },

    "27" => TriggeredDataChangeViolation {

    },

    "28" => InvalidAuthorizationSpecification {
        "P01" => InvalidPassword
    },

    "2B" => DependentPrivilegeDescriptorsStillExist {
        "P01" => DependentObjectsStillExist
    },

    "2D" => InvalidTransactionTermination {

    },

    "2F" => SqlRoutineException {
        "005" => FunctionExecutedNoReturnStatement,
        "002" => ModifyingSqlDataNotPermittedSqlRoutineException,
        "003" => ProhibitedSqlStatementAttemptedSqlRoutineException,
        "004" => ReadingSqlDataNotPermittedSqlRoutineException
    },

    "34" => InvalidCursorName {

    },

    "38" => ExternalRoutineException {
        "001" => ContainingSqlNotPermitted,
        "002" => ModifyingSqlDataNotPermittedExternalRoutineException,
        "003" => ProhibitedSqlStatementAttemptedExternalRoutineException,
        "004" => ReadingSqlDataNotPermittedExternalRoutineException
    },

    "39" => ExternalRoutineInvocationException {
        "001" => InvalidSqlstateReturned,
        "004" => NullValueNotAllowedExternalRoutineInvocationException,
        "P01" => TriggerProtocolViolated,
        "P02" => SrfProtocolViolated
    },

    "3B" => SavepointException {
        "001" => InvalidSavepointSpecification
    },

    "3D" => InvalidCatalogName {

    },

    "3F" => InvalidSchemaName {

    },

    "40" => TransactionRollback {
        "002" => TransactionIntegrityConstraintViolation,
        "001" => SerializationFailure,
        "003" => StatementCompletionUnknown,
        "P01" => DeadlockDetected
    },

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

    "44" => WithCheckOptionViolation {

    },

    "53" => InsufficientResources {
        "100" => DiskFull,
        "200" => OutOfMemory,
        "300" => TooManyConnections,
        "400" => ConfigurationLimitExceeded
    },

    "54" => ProgramLimitExceeded {
        "001" => StatementTooComplex,
        "011" => TooManyColumns,
        "023" => TooManyArguments
    },

    "55" => ObjectNotInPrerequisiteState {
        "006" => ObjectInUse,
        "P02" => CantChangeRuntimeParam,
        "P03" => LockNotAvailable
    },

    "57" => OperatorIntervention {
        "014" => QueryCanceled,
        "P01" => AdminShutdown,
        "P02" => CrashShutdown,
        "P03" => CannotConnectNow,
        "P04" => DatabaseDropped
    },

    "58" => SystemError {
        "030" => IoError,
        "P01" => UndefinedFile,
        "P02" => DuplicateFile
    },

    "F0" => ConfigFileError {
        "001" => LockFileExists
    },

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

    "P0" => PlpgsqlError {
        "001" => RaiseException,
        "002" => NoDataFound,
        "003" => TooManyRows
    },

    "XX" => InternalError {
        "001" => DataCorrupted,
        "002" => IndexCorrupted
    }
}

#[cfg(test)]
mod tests {
    use super::SqlState;

    #[test]
    fn test_from_code() {
        let sqlstate = SqlState::from_code("28P01");
        assert_eq!(sqlstate, SqlState::InvalidPassword);
        assert_eq!(sqlstate.class(), SqlState::InvalidAuthorizationSpecification);
    }
}
