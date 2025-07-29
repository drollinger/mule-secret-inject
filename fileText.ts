export const getEncryptKeyXML = (encryptKey: string) =>
  `\
<?xml version="1.0" encoding="UTF-8"?>

<mule xmlns="http://www.mulesoft.org/schema/mule/core" xmlns:doc="http://www.mulesoft.org/schema/mule/documentation"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://www.mulesoft.org/schema/mule/core http://www.mulesoft.org/schema/mule/core/current/mule.xsd">
	<global-property doc:name="Global Property" name="encrypt.key" value="${encryptKey}" />
</mule>
`;

export const secretsXML = `\
<?xml version="1.0" encoding="UTF-8"?>

<mule xmlns:secure-properties="http://www.mulesoft.org/schema/mule/secure-properties" xmlns="http://www.mulesoft.org/schema/mule/core"
	xmlns:doc="http://www.mulesoft.org/schema/mule/documentation"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mulesoft.org/schema/mule/core http://www.mulesoft.org/schema/mule/core/current/mule.xsd
http://www.mulesoft.org/schema/mule/secure-properties http://www.mulesoft.org/schema/mule/secure-properties/current/mule-secure-properties.xsd">
	<secure-properties:config name="Secure_Properties_Config" doc:name="Secure Properties Config" file="secrets.yaml" key="\${encrypt.key}" >
		<secure-properties:encrypt algorithm="Blowfish" />
	</secure-properties:config>
</mule>
`;

export const muleExclude = `\
**/src/main/mule/encrypt.key.xml
`;
