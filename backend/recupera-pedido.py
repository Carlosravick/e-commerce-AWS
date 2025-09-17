import os
import json
import boto3
import logging
from decimal import Decimal

# Configuração do logger (continua igual)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializa o client do DynamoDB (continua igual)
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

# Classe especial para converter o tipo Decimal do DynamoDB para JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            # Converte Decimal para float ou int, dependendo do caso
            if o % 1 == 0:
                return int(o)
            else:
                return float(o)
        return super(DecimalEncoder, self).default(o)

# Função para montar os headers de CORS (Cross-Origin Resource Sharing)
def get_cors_headers():
    origin = os.environ.get('CORS_ORIGIN') 
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type",
        # --- MUDANÇA: Permitir o método GET no CORS ---
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
        "Content-Type": "application/json"
    }

# Função principal da Lambda
def lambda_handler(event, _context):
    logger.info(f"Evento Recebido: {event}")

    # Tratamento de CORS Preflight para o método OPTIONS (continua igual)
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": get_cors_headers(),
            "body": json.dumps({ "message": "CORS preflight" })
        }

    pedido_id = None
    
    # --- MUDANÇA: Adicionada lógica para verificar se um pedidoId foi passado na URL ---
    # O API Gateway coloca os parâmetros do caminho (como {pedidoId}) aqui
    if event.get('pathParameters') and 'pedidoId' in event['pathParameters']:
        pedido_id = event['pathParameters']['pedidoId']

    try:
        # --- MUDANÇA: Lógica if/else para decidir qual busca fazer ---
        if pedido_id:
            # --- Cenário A: Buscar um único pedido ---
            logger.info(f"Buscando pedido único com ID: {pedido_id}")
            response = table.get_item(Key={'pedidoId': pedido_id})
            item = response.get('Item')
            
            if not item: # Se o pedido não for encontrado
                return {
                    "statusCode": 404,
                    "headers": get_cors_headers(),
                    "body": json.dumps({"message": "Pedido não encontrado"})
                }

            return {
                "statusCode": 200,
                "headers": get_cors_headers(),
                "body": json.dumps(item, cls=DecimalEncoder) # Usa o encoder para o 'total'
            }
        else:
            # --- Cenário B: Buscar todos os pedidos (seu código antigo) ---
            logger.info("Buscando todos os pedidos")
            response = table.scan()
            items = response.get("Items", [])
            logger.info(f"[DynamoDB] {len(items)} itens encontrados.")
            
            return {
                "statusCode": 200,
                "headers": get_cors_headers(),
                "body": json.dumps(items, cls=DecimalEncoder)
            }
            
    except Exception as e:
        logger.error(f"Falha ao acessar o DynamoDB: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": get_cors_headers(),
            "body": json.dumps({ "message": "Erro ao buscar pedidos", "erro": str(e) })
        }