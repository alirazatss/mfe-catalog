export type AccessRight =
  | "tvnadmin"
  | "tvnuser"
  | "tvnsuper"
  | "sysadmin"
  | "shipment_tracker"
  | "qa_evaluations"
  | "qa_approve_profiles"
  | "qa_edit_triptags"
  | "qa_filter"
  | "ttwc_profiles"
  | "ttwc_download"
  | "ttwc_launch"
  | "ttwc_configure_only"
  | "ttwc"
  | "tempview"
  | "tempview_gateway_settings"
  | "tempview_mission_result"
  | "rma"
  | "c_user_manager"
  | "cloudWithProfile"
  | "cloudLaunchLinkShipment"
  | "cloudStop"
  | "cloudLaunch"
  | "hide_temptracers"
  | "order"
  | "rest"
  | "rest_generic_logger"
  | "ccis"
  | "geotrack"
  | "edit_triptags"
  | "jreport";

export interface UserPreferences {
  readonly completeTvnId: string;
  readonly officeName: string;
  readonly companyTvnId: string;
  readonly username: string;
  readonly fullName: string;
  readonly email: string;
  readonly tenantName: string;
  readonly accessGroups: readonly string[];
  readonly accessRights: readonly AccessRight[];
}
